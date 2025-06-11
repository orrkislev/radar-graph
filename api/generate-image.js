// api/generate-image.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { width = 400, height = 400, ...params } = req.body;

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: width + 100, height: height + 100 });

    // Create HTML with p5.js sketch
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
        <style>
            body { margin: 0; padding: 20px; }
            canvas { border: 1px solid #ccc; }
        </style>
    </head>
    <body>
        <script>
            // Your p5.js sketch here
            function setup() {
                createCanvas(${width}, ${height});
                
                // Use the parameters from the POST request
                const params = ${JSON.stringify(params)};
                
                // Example sketch - replace with your actual sketch
                background(params.bgColor || 220);
                
                if (params.circles) {
                    fill(params.circleColor || 'red');
                    for (let i = 0; i < params.circles; i++) {
                        circle(
                            random(width), 
                            random(height), 
                            params.circleSize || 50
                        );
                    }
                }
                
                if (params.text) {
                    fill(params.textColor || 'black');
                    textSize(params.textSize || 24);
                    textAlign(CENTER, CENTER);
                    text(params.text, width/2, height/2);
                }
                
                // Signal that drawing is complete
                window.drawingComplete = true;
            }
            
            function draw() {
                // If you need animation, use draw()
                // Otherwise, keep it empty for static images
            }
        </script>
    </body>
    </html>`;

    await page.setContent(html);
    
    // Wait for p5.js to finish drawing
    await page.waitForFunction(() => window.drawingComplete, { timeout: 10000 });
    
    // Get the canvas element and screenshot it
    const canvas = await page.$('canvas');
    const imageBuffer = await canvas.screenshot({ type: 'png' });
    
    await browser.close();
    
    // Return the image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length);
    return res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}