import React, { useState, useEffect } from "react";

const App = () => {
  const [status, setStatus] = useState([]);
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const handleButtonClick = async () => {
    try {
      const response = await fetch("http://localhost:5000/process-images", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result);
      } else {
        throw new Error("Failed to start image processing");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    }
  };

  const selectImage = (image) => {
    setSelectedImage(image);
  };

  const clearSelectedImage = () => {
    setSelectedImage("");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5000/status")
        .then((response) => response.json())
        .then((data) => {
          setStatus(data.status);
          setSummary(data.summary);
          setError("");
        })
        .catch((error) => {
          console.error("Error fetching status:", error);
          setError("Failed to fetch status");
        });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Image Processing with YOLOv5</h1>
      <button onClick={handleButtonClick}>Start Processing</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <h2>Summary</h2>
        <p>Total Images: {summary.total}</p>
        <p>Processed: {summary.processed}</p>
        <p>Queue Size: {summary.queue}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Image Name</th>
            <th>Job ID</th>
            <th>Execution Time (ms)</th>
            <th>Original</th>
            <th>Processed</th>
            <th>Objects</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {status.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.imageName}</td>
              <td>{item.jobId}</td>
              <td>
                {item.executionTime !== null
                  ? item.executionTime
                  : "Processing..."}
              </td>
              <td>
                <button onClick={() => selectImage(item.original)}>
                  View Original
                </button>
              </td>
              <td>
                {item.processed ? (
                  <button onClick={() => selectImage(item.processed)}>
                    View Processed
                  </button>
                ) : (
                  "Processing..."
                )}
              </td>
              <td>
                {item.objects.map((obj, i) => (
                  <div key={i}>{obj}</div>
                ))}
              </td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedImage && (
        <div style={{ position: "relative" }}>
          <button
            onClick={clearSelectedImage}
            style={{ position: "absolute", right: 0 }}
          >
            Close
          </button>
          <img
            src={selectedImage}
            alt="Selected Content"
            style={{ width: "400px", height: "400px" }}
          />
        </div>
      )}
    </div>
  );
};

export default App;
