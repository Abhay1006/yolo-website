# worker.py
from celery import Celery
import os
from subprocess import run
import time
import pymongo

# Initialize Celery
app = Celery('image_processor', broker='pyamqp://guest@localhost//', backend='redis://localhost:6379/0')

# MongoDB connection
mongo_client = pymongo.MongoClient('mongodb+srv://abhaypratapsingh1006:fQhGZxIYzgdhWx6x@image.xyxylf2.mongodb.net/image_processing_db?retryWrites=true&w=majority')
db = mongo_client['image_processing_db']
results_collection = db['results']

@app.task
def process_image_task(image_path, job_id, image_name):
    output_dir = f'updated/{job_id}'
    os.makedirs(output_dir, exist_ok=True)

    start_time = time.time() * 1000  # Convert to milliseconds

    # Run YOLOv5 command
    command = [
        'python', 'yolov5/detect.py',
        '--source', image_path,
        '--project', 'updated',
        '--name', job_id,
        '--conf-thres', '0.4',
        '--save-txt', '--save-conf', '--exist-ok'
    ]
    run(command, check=True)

    end_time = time.time() * 1000  # Convert to milliseconds
    execution_time = end_time - start_time

    output_file_name = f'{os.path.splitext(image_name)[0]}.jpg'
    output_path = os.path.join(output_dir, output_file_name)

    # Generate URLs
    original_url = f'http://localhost:5000/input/{image_name}'
    processed_url = f'http://localhost:5000/updated/{job_id}/{output_file_name}'

    # Save results to MongoDB
    results_collection.insert_one({
        'imageName': image_name,
        'jobId': job_id,
        'startTime': start_time,
        'endTime': end_time,
        'executionTime': execution_time,
        'original': original_url,
        'processed': processed_url,
        'objects': [],  # Fill this with detected objects
        'status': 'Completed',
    })

    return {'status': 'Completed', 'processed_url': processed_url}
