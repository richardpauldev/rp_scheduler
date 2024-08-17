#!/bin/bash

# Define variables
BUILD_DIR=~/rp_scheduler/rp_scheduler_frontend/build
DEST_DIR=/var/www/scheduler.richardpauldev.com/html

# Build the React application
echo "Building the React application..."
cd ~/rp_scheduler/rp_scheduler_frontend || exit
npm run build

# Copy the build files to the destination directory
echo "Copying build files to the destination directory..."
sudo cp -r $BUILD_DIR/* $DEST_DIR

# Restart Nginx service
echo "Restarting Nginx service..."
sudo systemctl restart nginx

echo "Restarting Gunicorn service..."
sudo systemctl restart scheduler.service

echo "Deployment completed successfully."
