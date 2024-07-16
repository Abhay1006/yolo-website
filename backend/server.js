import express from "express";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import cors from "cors";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const inputDir = path.join(__dirname, "input");
const updatedDir = path.join(__dirname, "updated");

// MongoDB Connection
const mongoURI =
  "mongodb+srv://abhaypratapsingh1006:fQhGZxIYzgdhWx6x@image.xyxylf2.mongodb.net/?retryWrites=true&w=majority&appName=image";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define a schema for image processing results
const resultSchema = new mongoose.Schema({
  imageName: String,
  jobId: String,
  startTime: Date,
  endTime: Date,
  executionTime: Number,
  original: String,
  processed: String,
  objects: [String],
  status: String,
});

const Result = mongoose.model("Result", resultSchema);

const app = express();
app.use(express.json()); // To parse JSON bodies
app.use(cors({ origin: "http://localhost:5173" })); // Allow requests from the React app

// Serve static files from the updated and input directories
app.use("/updated", express.static(updatedDir));
app.use("/input", express.static(inputDir));

let status = [];
let summary = {
  total: 0,
  processed: 0,
  queue: 0,
};

async function processImage(imagePath, jobId, imageName) {
  return new Promise((resolve, reject) => {
    const outputFileName = path.parse(imageName).name + ".jpg";
    const outputPath = path.join(updatedDir, jobId, outputFileName);

    // Run YOLOv5 command
    exec(
      `python yolov5/detect.py --source ${imagePath} --project ${updatedDir} --name ${jobId} --conf-thres 0.4 --save-txt --save-conf --exist-ok`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running YOLOv5: ${stderr}`);
          return reject(error);
        }

        const endTime = Date.now();
        const executionTime =
          endTime - status.find((s) => s.jobId === jobId).startTime;

        // Update status and summary
        status = status.map((s) =>
          s.jobId === jobId
            ? {
                ...s,
                executionTime,
                status: "Completed",
                processed: `http://localhost:5000/updated/${jobId}/${outputFileName}`, // Updated URL for the processed image
              }
            : s
        );

        summary.processed += 1;
        summary.queue -= 1;

        // Save results to MongoDB
        await Result.create({
          imageName,
          jobId,
          startTime: status.find((s) => s.jobId === jobId).startTime,
          endTime,
          executionTime,
          original: `http://localhost:5000/input/${imageName}`,
          processed: `http://localhost:5000/updated/${jobId}/${outputFileName}`,
          objects: [], // This should be filled with detected objects, update this accordingly
          status: "Completed",
        });

        resolve();
      }
    );
  });
}

app.post("/process-images", async (req, res) => {
  try {
    const files = await fs.readdir(inputDir);
    summary.total = files.length;
    summary.processed = 0;
    summary.queue = 0;

    status = [];

    for (const [index, file] of files.entries()) {
      const filePath = path.join(inputDir, file);
      const jobId = `job-${index + 1}`;
      status.push({
        imageName: file,
        jobId,
        startTime: Date.now(),
        executionTime: null,
        original: `http://localhost:5000/input/${file}`, // Updated URL for the original image
        processed: null,
        objects: [],
        status: "Processing",
      });
      summary.queue += 1;
      await processImage(filePath, jobId, file);
    }

    res.json({ message: "Processing started" });
  } catch (err) {
    console.error("Error processing images:", err);
    res.status(500).json({ error: "Failed to process images" });
  }
});

app.get("/status", (req, res) => {
  res.json({ status, summary });
});

app.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
