const { ipcRenderer } = require('electron');

const outputImage = document.getElementById('output-image');

async function refreshImage() {
    try {
        const imagePath = await ipcRenderer.invoke('get-image-path');
        const uniqueTimestamp = new Date().getTime();
        outputImage.src = `${imagePath}?timestamp=${uniqueTimestamp}`;
    } catch (error) {
        console.error('Error getting image path:', error);
    }
}

// Set an interval to refresh the image every 250 milliseconds (4 fps)
setInterval(refreshImage, 1000 / 4);