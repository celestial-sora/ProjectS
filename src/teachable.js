// Teachable Machine integration
const MODEL_BASE_URL = "https://teachablemachine.withgoogle.com/models/pKC77Dyty/";

export class TeachableClassifier {
  constructor(options = {}) {
    this.model = null;
    this.webcam = null;
    this.maxPredictions = 0;
    this.isRunning = false;
    this.onPrediction = options.onPrediction || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.confidenceThreshold = 0.90; // 90% confidence threshold
  }

  async load() {
    this.onStatusChange({ status: 'loading', message: 'Loading AI model from Teachable Machine...' });
    const modelURL = MODEL_BASE_URL + "model.json";
    const metadataURL = MODEL_BASE_URL + "metadata.json";

    if (!window.tmImage) {
      throw new Error("Teachable Machine library (@teachablemachine/image) not loaded in window.");
    }

    try {
      this.model = await window.tmImage.load(modelURL, metadataURL);
      this.maxPredictions = this.model.getTotalClasses();
      this.onStatusChange({ 
        status: 'model-ready', 
        message: 'AI Model loaded successfully.',
        classes: this.model.getClassLabels()
      });
      return true;
    } catch (err) {
      console.error("Failed to load TM Model:", err);
      this.onStatusChange({ status: 'error', message: 'Could not load AI Model. ' + err.message });
      throw err;
    }
  }

  async setupWebcam(containerElement, width = 240, height = 240, flip = true) {
    if (!window.tmImage) {
      throw new Error("Teachable Machine library not ready.");
    }

    this.onStatusChange({ status: 'camera-init', message: 'Accessing webcam...' });
    
    try {
      this.webcam = new window.tmImage.Webcam(width, height, flip);
      await this.webcam.setup(); // request webcam access
      await this.webcam.play();
      
      this.previewContainers = [];
      if (containerElement) {
        if (Array.isArray(containerElement)) {
          this.previewContainers = containerElement.filter(Boolean);
        } else {
          this.previewContainers = [containerElement];
        }
      }

      this.previewContainers.forEach((el, idx) => {
        el.innerHTML = '';
        if (idx === 0) {
          el.appendChild(this.webcam.canvas);
        } else {
          // Create clone mirror canvas
          const mirror = document.createElement('canvas');
          mirror.width = width;
          mirror.height = height;
          mirror.className = 'w-full h-full object-cover';
          el.appendChild(mirror);
          this.mirrorCanvas = mirror;
        }
      });
      
      this.isRunning = true;
      this.loop();
      this.onStatusChange({ status: 'active', message: 'Webcam connected and tracking.' });
      return true;
    } catch (err) {
      console.error("Camera access denied or error:", err);
      this.onStatusChange({ status: 'camera-error', message: 'Camera permission denied or unavailable.' });
      return false;
    }
  }

  loop = async () => {
    if (!this.isRunning) return;
    if (this.webcam) {
      this.webcam.update();
      if (this.mirrorCanvas && this.webcam.canvas) {
        const mctx = this.mirrorCanvas.getContext('2d');
        if (mctx) {
          mctx.drawImage(this.webcam.canvas, 0, 0, this.mirrorCanvas.width, this.mirrorCanvas.height);
        }
      }
      await this.predict();
    }
    requestAnimationFrame(this.loop);
  };

  async predict() {
    if (!this.model || !this.webcam || !this.webcam.canvas) return;

    try {
      const prediction = await this.model.predict(this.webcam.canvas);
      
      let topClass = "empty";
      let topProbability = 0;
      let fanProbability = 0;
      let emptyProbability = 0;

      for (let i = 0; i < this.maxPredictions; i++) {
        const className = prediction[i].className;
        const prob = prediction[i].probability;

        if (className.toLowerCase() === "fan") {
          fanProbability = prob;
        } else if (className.toLowerCase() === "empty") {
          emptyProbability = prob;
        }

        if (prob > topProbability) {
          topProbability = prob;
          topClass = className;
        }
      }

      // User Rule:
      // Class "Fan" -> Jump ONLY when Confidence >= 90% (0.90)
      // Otherwise -> Stays idle/ground
      const isFanConfident = fanProbability >= this.confidenceThreshold;

      this.onPrediction({
        topClass,
        topProbability,
        fanProbability,
        emptyProbability,
        isFanConfident,
        raw: prediction
      });
    } catch (err) {
      // ignore frame prediction glitch
    }
  }

  stop() {
    this.isRunning = false;
    if (this.webcam) {
      try {
        this.webcam.stop();
      } catch (e) {}
    }
  }
}
