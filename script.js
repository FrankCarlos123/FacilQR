document.addEventListener('DOMContentLoaded', function() {
    const cameraBtn = document.querySelector('.camera-btn');
    cameraBtn.onclick = startCamera;
});

let qrcode = null;
let countdownInterval = null;
let stream = null;

async function startCamera() {
    try {
        const camera = document.getElementById('camera');
        const capturedImage = document.getElementById('captured-image');
        
        capturedImage.style.display = 'none';
        camera.style.display = 'block';

        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        camera.srcObject = stream;

        const cameraBtn = document.querySelector('.camera-btn');
        cameraBtn.textContent = 'Capturar';
        cameraBtn.onclick = captureImage;
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        alert('Error al acceder a la cámara. Verifica los permisos.');
    }
}

async function captureImage() {
    const camera = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const capturedImage = document.getElementById('captured-image');

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(camera, 0, 0);

    capturedImage.src = canvas.toDataURL('image/jpeg', 1.0);
    capturedImage.style.display = 'block';
    camera.style.display = 'none';

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    const cameraBtn = document.querySelector('.camera-btn');
    cameraBtn.textContent = 'Tomar Foto';
    cameraBtn.onclick = startCamera;

    processImage(canvas);
}

async function processImage(canvas) {
    try {
        // Convertir canvas a Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        
        // Preparar datos para ImgBB
        const formData = new FormData();
        formData.append('image', blob);
        
        console.log("Subiendo imagen a ImgBB...");
        
        // Subir a ImgBB
        const uploadResponse = await fetch('https://api.imgbb.com/1/upload?key=52caeb3987a1d3e1407627928b18c14e', {
            method: 'POST',
            body: formData
        });
        
        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
            throw new Error('Error al subir la imagen');
        }

        const imageUrl = uploadResult.data.url;
        console.log("Imagen subida:", imageUrl);
        
        // Usar OCR.space con la URL de la imagen
        const ocrUrl = `https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&OCREngine=2`;
        
        console.log("Procesando OCR...");
        const ocrResponse = await fetch(ocrUrl);
        const ocrResult = await ocrResponse.json();
        
        console.log("Resultado OCR:", ocrResult);

        if (ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
            const text = ocrResult.ParsedResults[0].ParsedText;
            console.log("Texto detectado:", text);

            // Buscar específicamente después de "Códigos de barras:"
            const match = text.match(/Códigos de barras:\s*([\d\s]+)/);
            
            if (match) {
                // Limpiar y separar los códigos
                const codigosTexto = match[1].trim();
                const codigos = codigosTexto.match(/\d{12,14}/g);
                
                if (codigos && codigos.length > 0) {
                    document.getElementById('text').value = codigos[0]; // Tomar el primer código
                    generateQR();
                } else {
                    alert('No se encontraron códigos de barras válidos');
                }
            } else {
                alert('No se encontró el formato esperado de códigos de barras');
            }
        } else {
            alert('No se pudo extraer texto de la imagen');
        }

    } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert('Error al procesar la imagen. Por favor, intenta de nuevo.');
    }
}

function generateQR() {
    const text = document.getElementById('text').value;
    if (!text) return;

    document.getElementById('qrcode').innerHTML = '';
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    qrcode = new QRCode(document.getElementById('qrcode'), {
        text: text,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#FFFFFF",
        correctLevel: QRCode.CorrectLevel.H
    });

    document.getElementById('qr-text').textContent = text;
    startCountdown();
}

function startCountdown() {
    let count = 10;
    const countdownElement = document.getElementById('countdown');
    countdownElement.textContent = `Limpieza automática en ${count} segundos`;

    countdownInterval = setInterval(() => {
        count--;
        countdownElement.textContent = `Limpieza automática en ${count} segundos`;
        
        if (count <= 0) {
            clearInterval(countdownInterval);
            clearAll();
        }
    }, 1000);
}

function clearAll() {
    const inputElement = document.getElementById('text');
    inputElement.value = '';
    inputElement.focus();
    
    document.getElementById('qrcode').innerHTML = '';
    document.getElementById('qr-text').textContent = '';
    document.getElementById('countdown').textContent = '';
    document.getElementById('captured-image').style.display = 'none';
    
    qrcode = null;

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

document.getElementById('text').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        generateQR();
    }
});
