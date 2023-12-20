const fs = require('fs');
const path = require('path');

function getResourcePath(relativePath) {
    const isDevelopment = process.env.ELECTRON_ENV === 'development';
    if (isDevelopment) {
        // Development mode
        return path.join(__dirname, relativePath);
    } else {
        // Production mode
        return path.join(process.resourcesPath, relativePath);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const webcam = document.getElementById('webcam');
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const cameraSelector = document.getElementById('camera-selector');
    const penSize = document.getElementById('pen-size');
    const penColor = document.getElementById('pen-color');
    const undoCanvas = document.getElementById('undo-canvas');
    const resetCanvas = document.getElementById('reset-canvas');

    // Function to update the placeholder with the content of prompt.txt
    function updatePlaceholder() {
        const filePath = getResourcePath('prompt/prompt.txt');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error("Error reading file:", err);
                return;
            }

            const textInput = document.getElementById('textInput');
            textInput.placeholder = data;
        });
    }

    // Call this function when your app starts
    updatePlaceholder();

    // Get the input field
    const inputField = document.getElementById('textInput');

    // Event listener for input changes
    inputField.addEventListener('input', () => {
        let text = inputField.value;

        // Only write to the file if there is some text
        if (text.trim() !== '') {
            fs.writeFile(getResourcePath('/prompt/prompt.txt'), text, (err) => {
                if (err) {
                    console.error('An error occurred:', err);
                    return;
                }
                console.log('Text saved!');
            });
        }
    });


    // Get media devices access and enumerate cameras
    async function getCameras() {
        try {
            // Prompt user for permission and get stream
            let stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop the stream as we just need permission
            stream.getTracks().forEach(track => track.stop());
            // Now enumerate devices
            await updateCameraList();
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }

    // Function to enumerate cameras and update the selector
    async function updateCameraList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            cameraSelector.innerHTML = '<option value="" disabled selected>Please select</option>';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${cameraSelector.length + 1}`;
                cameraSelector.appendChild(option);
            });
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }

    // Function to start the webcam feed
    async function startWebcam(deviceId) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: deviceId ? { exact: deviceId } : undefined }
            });
            webcam.srcObject = stream;
        } catch (error) {
            console.error('Error starting webcam', error);
        }
    }

    // Stores all paths, each path is an array of points
    let paths = [];
    let currentPath = {};
    let isDragging = false;
    let isDrawing = false;
    let draggedPathIndex = -1;
    let initialClick = null;

    canvas.addEventListener('mousedown', (e) => {
        const pathIndex = paths.findIndex(path => isNearPath(e, path.points));
        if (pathIndex >= 0) {
            isDragging = true;
            isDrawing = false;
            draggedPathIndex = pathIndex;
            initialClick = { x: e.offsetX, y: e.offsetY };
        } else {
            isDragging = false;
            isDrawing = true;
            currentPath = {
                points: [{ x: e.offsetX, y: e.offsetY }],
                size: penSize.value,
                color: penColor.value
            };
            paths.push(currentPath);
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            ctx.lineWidth = currentPath.size;
            ctx.strokeStyle = currentPath.color;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            currentPath.points.push({ x: e.offsetX, y: e.offsetY });
        } else if (isDragging && draggedPathIndex >= 0) {
            movePath(e, paths[draggedPathIndex]);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        isDragging = false;
        draggedPathIndex = -1;
    });

    function isNearPath(mouseEvent, pathPoints, threshold = 10) {
        return pathPoints.some(point => {
            const dx = point.x - mouseEvent.offsetX;
            const dy = point.y - mouseEvent.offsetY;
            return Math.sqrt(dx * dx + dy * dy) <= threshold;
        });
    }

    function movePath(mouseEvent, path) {
        if (!initialClick) return;

        const dx = mouseEvent.offsetX - initialClick.x;
        const dy = mouseEvent.offsetY - initialClick.y;

        path.points.forEach(point => {
            point.x += dx;
            point.y += dy;
        });

        initialClick.x = mouseEvent.offsetX;
        initialClick.y = mouseEvent.offsetY;

        redrawAllPaths();
    }

    function redrawAllPaths() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        paths.forEach(path => {
            ctx.beginPath();
            ctx.lineWidth = path.size;
            ctx.strokeStyle = path.color;
            ctx.moveTo(path.points[0].x, path.points[0].y);
            path.points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
        });
    }

    undoCanvas.addEventListener('click', () => {
        if (paths.length > 0) {
            paths.pop();
            redrawAllPaths();
        }
    });

    resetCanvas.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        paths = [];
    });

    // Request camera access and update camera list on page load
    getCameras();

    cameraSelector.addEventListener('change', () => {
        if (cameraSelector.value) {
            startWebcam(cameraSelector.value);
        }
    });

    // Function to adjust canvas size
    function adjustCanvasSize() {
        // Adjust the canvas size to match the webcam size
        canvas.width = webcam.clientWidth;
        canvas.height = webcam.clientHeight;

        // Redraw all paths with their original coordinates
        redrawAllPaths();
    }

    // Adjust canvas size on window resize and when the webcam starts
    window.addEventListener('resize', adjustCanvasSize);

    let isCapturing = false;
    const startCapture = document.getElementById('start-capture');
    const stopCapture = document.getElementById('stop-capture');

    startCapture.addEventListener('click', () => {
        if (!isCapturing) {
            isCapturing = true;
            captureLoop();
        }
    });

    stopCapture.addEventListener('click', () => {
        isCapturing = false;
    });

    async function captureLoop() {
        if (isCapturing) {
            await saveFrame(); // Wait for the frame to be saved
            setTimeout(captureLoop, 1000 / 4); // Run this loop at 4 fps
        }
    }

    const fsPromises = fs.promises;

    async function saveFrame() {
        // Get the user-defined max size
        const maxSize = parseInt(document.getElementById('max-size').value, 10) || canvas.width;

        // Calculate the aspect ratio for the canvas and webcam
        const canvasAspectRatio = canvas.width / canvas.height;
        const webcamAspectRatio = webcam.videoWidth / webcam.videoHeight;

        // Calculate new size for the temporary canvas based on the max size
        let newWidth, newHeight;
        if (canvasAspectRatio > webcamAspectRatio) {
            newWidth = maxSize;
            newHeight = maxSize / canvasAspectRatio;
        } else {
            newHeight = maxSize;
            newWidth = maxSize * canvasAspectRatio;
        }

        // Create and set up the temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Scale and position the webcam feed to cover the entire canvas
        let scale = Math.max(newWidth / webcam.videoWidth, newHeight / webcam.videoHeight);
        let webcamScaledWidth = webcam.videoWidth * scale;
        let webcamScaledHeight = webcam.videoHeight * scale;
        let offsetX = (newWidth - webcamScaledWidth) / 2;
        let offsetY = (newHeight - webcamScaledHeight) / 2;

        // Draw the webcam and paths onto the temporary canvas
        tempCtx.drawImage(webcam, offsetX, offsetY, webcamScaledWidth, webcamScaledHeight);
        tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

        // Save the combined image
        const dataURL = tempCanvas.toDataURL('image/jpeg');
        const buffer = Buffer.from(dataURL.split(',')[1], 'base64');
        const filename = 'capture.jpg';
        const dir = getResourcePath('saved_frames');

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filepath = path.join(dir, filename);
        try {
            await fsPromises.writeFile(filepath, buffer);
        } catch (error) {
            console.error('Error writing file:', error);
        }
    }
    adjustCanvasSize();
});

const { ipcRenderer } = require('electron');

document.getElementById('openWindow').addEventListener('click', () => {
    ipcRenderer.send('open-output-window');
});