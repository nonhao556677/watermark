const { PDFDocument, rgb, degrees } = PDFLib;

const form = document.getElementById('watermarkForm');
const pdfFileInput = document.getElementById('pdfFile');
const watermarkTextInput = document.getElementById('watermarkText');
const fontSizeInput = document.getElementById('fontSize');
const opacityInput = document.getElementById('opacity');
const colorInput = document.getElementById('color');
const positionInput = document.getElementById('position');
const submitButton = document.getElementById('submitButton');
const buttonText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');

PDFDocument.registerFontkit(fontkit);

const fontUrl = './Sarabun-Regular.ttf';
let fontBytes = null;

fetch(fontUrl)
    .then(res => res.arrayBuffer())
    .then(data => {
        fontBytes = data;
        console.log('Thai font loaded successfully from local file.');
    }).catch(err => {
        console.error('Failed to load local font file:', err);
        alert('ไม่สามารถโหลดไฟล์ฟอนต์ Sarabun-Regular.ttf ได้! กรุณาตรวจสอบว่าวางไฟล์ถูกที่และตั้งชื่อถูกต้อง');
    });

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pdfFile = pdfFileInput.files[0];
    if (!pdfFile) {
        alert('กรุณาเลือกไฟล์ PDF');
        return;
    }
    if (!fontBytes) {
        alert('ฟอนต์ยังโหลดไม่เสร็จสมบูรณ์ กรุณารอสักครู่แล้วลองอีกครั้ง');
        return;
    }

    setLoading(true);

    try {
        const existingPdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const customFont = await pdfDoc.embedFont(fontBytes);
        
        const watermarkText = watermarkTextInput.value;
        const fontSize = parseInt(fontSizeInput.value, 10);
        const opacity = parseFloat(opacityInput.value);
        const position = positionInput.value;
        const color = hexToRgb(colorInput.value);

        const pages = pdfDoc.getPages();

        for (const page of pages) {
            const { width, height } = page.getSize();
            const textWidth = customFont.widthOfTextAtSize(watermarkText, fontSize);
            const textHeight = customFont.heightAtSize(fontSize);

            const options = {
                font: customFont,
                size: fontSize,
                color: rgb(color.r, color.g, color.b),
                opacity: opacity,
            };

            const coords = calculateCoordinates(position, width, height, textWidth, textHeight, options);
            page.drawText(watermarkText, coords);
        }

        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `watermarked_${pdfFile.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการเพิ่มลายน้ำ: ' + error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        buttonText.textContent = 'กำลังประมวลผล...';
        spinner.classList.remove('d-none');
        submitButton.disabled = true;
    } else {
        buttonText.textContent = 'เพิ่มลายน้ำและดาวน์โหลด';
        spinner.classList.add('d-none');
        submitButton.disabled = false;
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}

function calculateCoordinates(position, pageWidth, pageHeight, textWidth, textHeight, options) {
    const margin = 20;
    const coords = { x: 0, y: 0, rotate: degrees(0) };
    
    switch (position) {
        case 'center':
            coords.rotate = degrees(45);
            coords.x = pageWidth / 2 - textWidth / 2;
            coords.y = pageHeight / 2 - textHeight / 4;
            break;
        case 'topLeft':
            coords.x = margin;
            coords.y = pageHeight - textHeight - margin;
            break;
        case 'topCenter':
            coords.x = (pageWidth - textWidth) / 2;
            coords.y = pageHeight - textHeight - margin;
            break;
        case 'topRight':
            coords.x = pageWidth - textWidth - margin;
            coords.y = pageHeight - textHeight - margin;
            break;
        case 'middleLeft':
            coords.x = margin;
            coords.y = (pageHeight - textHeight) / 2;
            break;
        case 'middleRight':
            coords.x = pageWidth - textWidth - margin;
            coords.y = (pageHeight - textHeight) / 2;
            break;
        case 'bottomLeft':
            coords.x = margin;
            coords.y = margin;
            break;
        case 'bottomCenter':
            coords.x = (pageWidth - textWidth) / 2;
            coords.y = margin;
            break;
        case 'bottomRight':
            coords.x = pageWidth - textWidth - margin;
            coords.y = margin;
            break;
    }
    return { ...options, ...coords };
}