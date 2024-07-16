# celery.py
from celery import Celery

# Celery configuration
app = Celery('image_processor', broker='pyamqp://guest@localhost//', backend='redis://localhost:6379/0')

# Optional: Define a task
@app.task
def process_image_task(image_path, job_id, image_name):
    import os
    from subprocess import run
    import time

    output_dir = f'updated/{job_id}'
    os.makedirs(output_dir, exist_ok=True)

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
    from app import Result  # Import the Result model from your Express app
    Result.create({
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
