"use client";
import React from "react";

import { useUpload } from "../utilities/runtime-helpers";

function MainComponent() {
  const [currentView, setCurrentView] = React.useState("home");
  const [capturedPhoto, setCapturedPhoto] = React.useState(null);
  const [uploadedPhoto, setUploadedPhoto] = React.useState(null);
  const [photoNote, setPhotoNote] = React.useState("");
  const [error, setError] = React.useState(null);
  const [cameraStream, setCameraStream] = React.useState(null);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [countdown, setCountdown] = React.useState(null);
  const [upload, { loading }] = useUpload();
  const videoRef = React.useRef(null);

  // New photo strip states
  const [photoStripMode, setPhotoStripMode] = React.useState(false);
  const [selectedPhotoCount, setSelectedPhotoCount] = React.useState(2);
  const [capturedPhotos, setCapturedPhotos] = React.useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);

  // Window width state for responsive design
  const [windowWidth, setWindowWidth] = React.useState(0);

  // Effect to handle window resize and initial width
  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to handle photo strip completion
  React.useEffect(() => {
    console.log('Photo strip check:', {
      photoStripMode,
      capturedCount: capturedPhotos.length,
      selectedPhotoCount,
      currentView
    });

    if (photoStripMode && capturedPhotos.length === selectedPhotoCount && currentView === "camera") {
      console.log('All photos captured, transitioning to preview');
      // All photos captured, transition to preview
      setTimeout(() => {
        setCurrentView("photoStripPreview");
        // Stop camera stream
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
          setCameraStream(null);
          setCameraReady(false);
        }
      }, 300);
    }
  }, [photoStripMode, capturedPhotos.length, selectedPhotoCount, currentView, cameraStream]);

  const handleUseCamera = React.useCallback(async () => {
    try {
      setError(null);
      setCameraReady(false);

      // Stop any existing stream first
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
        },
        audio: false,
      });

      setCameraStream(stream);
      setCurrentView("camera");
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setError(
          "Camera access denied. Please allow camera permissions and refresh the page."
        );
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please make sure your device has a camera.");
      } else {
        setError("Camera error: " + err.message);
      }
    }
  }, [cameraStream]);

  const handlePhotoStrip = React.useCallback(() => {
    setPhotoStripMode(true);
    setCurrentView("photoStripSetup");
  }, []);

  const startPhotoStrip = React.useCallback(async () => {
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);
    await handleUseCamera();
  }, [handleUseCamera]);

  const handleUploadPhotos = React.useCallback(() => {
    setCurrentView("upload");
  }, []);

  const handleFileUpload = React.useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const { url, error } = await upload({ file });
        if (error) {
          setError(error);
          return;
        }
        setUploadedPhoto(url);
        setCurrentView("preview");
      } catch (err) {
        setError("Failed to upload photo");
      }
    },
    [upload]
  );

  const startCountdown = React.useCallback(() => {
    if (!cameraReady) {
      setError("Camera not ready. Please wait a moment and try again.");
      return;
    }

    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Take the photo after countdown
          setTimeout(() => {
            const video = videoRef.current;
            if (video) {
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              const ctx = canvas.getContext("2d");

              // Flip the image horizontally (mirror effect)
              ctx.scale(-1, 1);
              ctx.drawImage(video, -canvas.width, 0);

              const photoUrl = canvas.toDataURL("image/jpeg", 0.9);

              if (photoStripMode) {
                // Add to photo strip
                const newPhotos = [...capturedPhotos, photoUrl];
                console.log(`Photo captured: ${newPhotos.length}/${selectedPhotoCount}`, newPhotos);
                setCapturedPhotos(newPhotos);

                if (newPhotos.length < selectedPhotoCount) {
                  // Take next photo
                  setCurrentPhotoIndex(newPhotos.length);
                  // Brief pause before next photo
                  setTimeout(() => {
                    setCountdown(null);
                  }, 1000);
                }
                // Note: Photo strip completion is handled by useEffect
              } else {
                // Single photo mode
                setCapturedPhoto(photoUrl);
                setCurrentView("preview");
                // Stop camera stream
                if (cameraStream) {
                  cameraStream.getTracks().forEach((track) => track.stop());
                  setCameraStream(null);
                  setCameraReady(false);
                }
              }
            }
            if (
              !photoStripMode ||
              capturedPhotos.length + 1 >= selectedPhotoCount
            ) {
              setCountdown(null);
            }
          }, 200);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [
    cameraStream,
    cameraReady,
    photoStripMode,
    selectedPhotoCount,
    capturedPhotos,
  ]);

  const goHome = React.useCallback(() => {
    setCurrentView("home");
    setCapturedPhoto(null);
    setUploadedPhoto(null);
    setPhotoNote("");
    setError(null);
    setCameraReady(false);
    setCountdown(null);
    setPhotoStripMode(false);
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);
    setSelectedPhotoCount(1);

    // Stop camera if active
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  React.useEffect(() => {
    if (currentView === "camera" && cameraStream && videoRef.current) {
      const video = videoRef.current;

      const handleLoadedMetadata = () => {
        setCameraReady(true);
        console.log("Camera ready:", video.videoWidth, "x", video.videoHeight);
      };

      const handleError = (e) => {
        console.error("Video error:", e);
        setError("Failed to start camera preview");
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("error", handleError);

      video.srcObject = cameraStream;
      video.play().catch((err) => {
        console.error("Video play error:", err);
        setError("Failed to start camera preview: " + err.message);
      });

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("error", handleError);
      };
    }
  }, [currentView, cameraStream]);

  // Photo Strip Setup View
  if (currentView === "photoStripSetup") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        <div
          style={{ textAlign: "center", marginBottom: "40px", maxWidth: "90%" }}
        >
          <h1
            style={{
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(32px, 8vw, 52px)",
              color: "#8b4513",
              marginBottom: "20px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(139, 69, 19, 0.2)",
            }}
          >
            Create Photo Strip 📸
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              color: "#8b4513",
              fontFamily: "serif",
              opacity: "0.8",
            }}
          >
            How many photos would you like?
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(15px, 4vw, 30px)",
            marginBottom: "40px",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          {[2, 3].map((count) => (
            <button
              key={count}
              onClick={() => setSelectedPhotoCount(count)}
              style={{
                backgroundColor:
                  selectedPhotoCount === count ? "#8b4513" : "transparent",
                color: selectedPhotoCount === count ? "white" : "#8b4513",
                border: "3px solid #8b4513",
                padding: "clamp(15px, 3vw, 25px) clamp(20px, 4vw, 35px)",
                borderRadius: "20px",
                fontSize: "clamp(18px, 4vw, 24px)",
                fontFamily: "serif",
                cursor: "pointer",
                transition: "all 0.3s ease",
                minWidth: "clamp(100px, 25vw, 120px)",
                boxShadow:
                  selectedPhotoCount === count
                    ? "0 8px 25px rgba(139, 69, 19, 0.4)"
                    : "none",
                flex: "1 1 auto",
              }}
              onMouseOver={(e) => {
                if (selectedPhotoCount !== count) {
                  e.target.style.backgroundColor = "rgba(139, 69, 19, 0.1)";
                }
              }}
              onMouseOut={(e) => {
                if (selectedPhotoCount !== count) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              {count} Photo{count > 1 ? "s" : ""}
            </button>
          ))}
        </div>

        {/* Preview of photo strip layout */}
        <div
          style={{
            backgroundColor: "white",
            padding: "clamp(15px, 3vw, 20px)",
            borderRadius: "15px",
            boxShadow: "0 10px 30px rgba(139, 69, 19, 0.3)",
            marginBottom: "30px",
            maxWidth: "90%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              border: "3px solid #8b4513",
              padding: "15px",
              borderRadius: "10px",
            }}
          >
            {Array.from({ length: selectedPhotoCount }, (_, i) => (
              <div
                key={i}
                style={{
                  width: "clamp(120px, 30vw, 150px)",
                  height: "clamp(80px, 20vw, 100px)",
                  backgroundColor: "#f0f0f0",
                  border: "2px dashed #8b4513",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(12px, 3vw, 14px)",
                  color: "#8b4513",
                  fontFamily: "serif",
                }}
              >
                Photo {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(15px, 4vw, 25px)",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <button
            onClick={startPhotoStrip}
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "clamp(15px, 3vw, 20px) clamp(25px, 5vw, 40px)",
              borderRadius: "30px",
              fontSize: "clamp(16px, 4vw, 20px)",
              fontFamily: "serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 25px rgba(139, 69, 19, 0.4)",
              flex: "1 1 auto",
              minWidth: "180px",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-3px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0)";
            }}
          >
            📸 Start Photo Strip
          </button>

          <button
            onClick={goHome}
            style={{
              backgroundColor: "transparent",
              color: "#8b4513",
              border: "3px solid #8b4513",
              padding: "clamp(12px, 3vw, 17px) clamp(20px, 4vw, 35px)",
              borderRadius: "30px",
              fontSize: "clamp(16px, 4vw, 20px)",
              fontFamily: "serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              flex: "1 1 auto",
              minWidth: "140px",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#8b4513";
            }}
          >
            ← Back Home
          </button>
        </div>
      </div>
    );
  }

  // Photo Strip Preview View
  if (currentView === "photoStripPreview") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        <div
          style={{ textAlign: "center", marginBottom: "30px", maxWidth: "90%" }}
        >
          <h1
            style={{
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(32px, 8vw, 48px)",
              color: "#8b4513",
              marginBottom: "10px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(139, 69, 19, 0.2)",
            }}
          >
            Your Photo Strip! 🎭
          </h1>
          <p
            style={{
              fontFamily: "serif",
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#8b4513",
              opacity: "0.8",
            }}
          >
            Classic vintage memories
          </p>
        </div>

        {/* Photo Strip */}
        <div
          style={{
            backgroundColor: "white",
            padding:
              "clamp(15px, 3vw, 20px) clamp(15px, 3vw, 20px) clamp(45px, 8vw, 60px) clamp(15px, 3vw, 20px)",
            borderRadius: "15px",
            boxShadow:
              "0 20px 40px rgba(139, 69, 19, 0.3), 0 0 0 1px rgba(139, 69, 19, 0.1)",
            marginBottom: "30px",
            position: "relative",
            maxWidth: "clamp(280px, 80vw, 320px)",
            width: "100%",
          }}
        >
          <div
            style={{
              border: "3px solid #8b4513",
              borderRadius: "10px",
              overflow: "hidden",
              position: "relative",
              background: "#8b4513",
            }}
          >
            {capturedPhotos.map((photo, index) => (
              <div key={index} style={{ position: "relative" }}>
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "clamp(140px, 35vw, 180px)",
                    objectFit: "cover",
                    display: "block",
                    filter:
                      "sepia(40%) contrast(1.3) brightness(1.1) saturate(0.7) hue-rotate(15deg)",
                    borderBottom:
                      index < capturedPhotos.length - 1
                        ? "2px solid #8b4513"
                        : "none",
                  }}
                />
                {/* Vintage overlay for each photo */}
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    background:
                      "radial-gradient(circle, transparent 40%, rgba(139, 69, 19, 0.1) 100%)",
                    pointerEvents: "none",
                  }}
                ></div>
              </div>
            ))}
          </div>

          {/* Note area at bottom of strip */}
          <div
            style={{
              position: "absolute",
              bottom: "15px",
              left: "20px",
              right: "20px",
              textAlign: "center",
            }}
          >
            {photoNote ? (
              <p
                style={{
                  fontFamily: "Dancing Script, cursive",
                  fontSize: "clamp(12px, 3vw, 16px)",
                  color: "#8b4513",
                  fontStyle: "italic",
                  margin: "0",
                  lineHeight: "1.3",
                }}
              >
                "{photoNote}"
              </p>
            ) : (
              <p
                style={{
                  fontFamily: "serif",
                  fontSize: "clamp(10px, 2.5vw, 12px)",
                  color: "#8b4513",
                  opacity: "0.5",
                  margin: "0",
                  fontStyle: "italic",
                }}
              >
                Add a note to remember this moment...
              </p>
            )}
          </div>
        </div>

        {/* Note input */}
        <div
          style={{
            marginBottom: "30px",
            width: "100%",
            maxWidth: "clamp(280px, 80vw, 320px)",
            textAlign: "center",
          }}
        >
          <textarea
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            placeholder="Write about your photo strip..."
            maxLength={80}
            style={{
              width: "100%",
              padding: "clamp(10px, 2vw, 12px)",
              borderRadius: "12px",
              border: "2px solid #8b4513",
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "#8b4513",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              resize: "none",
              height: "clamp(50px, 12vw, 60px)",
              boxShadow: "inset 0 2px 5px rgba(139, 69, 19, 0.1)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#a0522d";
              e.target.style.boxShadow =
                "inset 0 2px 5px rgba(139, 69, 19, 0.2), 0 0 0 3px rgba(139, 69, 19, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#8b4513";
              e.target.style.boxShadow =
                "inset 0 2px 5px rgba(139, 69, 19, 0.1)";
            }}
          />
          <p
            style={{
              fontSize: "clamp(9px, 2vw, 11px)",
              color: "#8b4513",
              opacity: "0.6",
              marginTop: "5px",
              fontFamily: "serif",
            }}
          >
            {photoNote.length}/80 characters
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(15px, 4vw, 20px)",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <button
            onClick={() => {
              // Create a canvas to combine all photos with vintage styling
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              const photoWidth = 260;
              const photoHeight = 180;
              const borderWidth = 20;
              const noteHeight = 60;

              canvas.width = photoWidth + (borderWidth * 2);
              canvas.height = (photoHeight * capturedPhotos.length) + (borderWidth * 2) + noteHeight;

              // Draw vintage paper background
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#f5f1eb');
              gradient.addColorStop(1, '#e8dcc0');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Add paper texture
              ctx.fillStyle = 'rgba(139, 69, 19, 0.05)';
              for (let i = 0; i < 100; i++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
              }

              // Load and draw each photo with vintage effects
              let loadedCount = 0;
              capturedPhotos.forEach((photoUrl, index) => {
                const img = new Image();
                img.onload = () => {
                  const yPos = borderWidth + (index * photoHeight);

                  // Draw brown border around photo
                  ctx.fillStyle = '#8b4513';
                  ctx.fillRect(borderWidth - 3, yPos - 3, photoWidth + 6, photoHeight + 6);

                  // Apply vintage filter to the image
                  const tempCanvas = document.createElement('canvas');
                  const tempCtx = tempCanvas.getContext('2d');
                  tempCanvas.width = photoWidth;
                  tempCanvas.height = photoHeight;

                  // Draw image
                  tempCtx.drawImage(img, 0, 0, photoWidth, photoHeight);

                  // Apply vintage sepia effect
                  const imageData = tempCtx.getImageData(0, 0, photoWidth, photoHeight);
                  const data = imageData.data;

                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Sepia formula with vintage adjustments
                    data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189)) * 1.1; // Red
                    data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)) * 1.1; // Green
                    data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)) * 0.9; // Blue
                  }

                  tempCtx.putImageData(imageData, 0, 0);

                  // Draw the processed image
                  ctx.drawImage(tempCanvas, borderWidth, yPos);

                  // Add vintage vignette overlay
                  const vignetteGradient = ctx.createRadialGradient(
                    borderWidth + photoWidth/2, yPos + photoHeight/2, 0,
                    borderWidth + photoWidth/2, yPos + photoHeight/2, Math.max(photoWidth, photoHeight)/2
                  );
                  vignetteGradient.addColorStop(0, 'rgba(139, 69, 19, 0)');
                  vignetteGradient.addColorStop(0.6, 'rgba(139, 69, 19, 0)');
                  vignetteGradient.addColorStop(1, 'rgba(139, 69, 19, 0.15)');
                  ctx.fillStyle = vignetteGradient;
                  ctx.fillRect(borderWidth, yPos, photoWidth, photoHeight);

                  // Add separator line between photos (except last one)
                  if (index < capturedPhotos.length - 1) {
                    ctx.strokeStyle = '#8b4513';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(borderWidth, yPos + photoHeight);
                    ctx.lineTo(borderWidth + photoWidth, yPos + photoHeight);
                    ctx.stroke();
                  }

                  loadedCount++;
                  if (loadedCount === capturedPhotos.length) {
                    // Add note at the bottom if it exists
                    if (photoNote) {
                      const noteY = borderWidth + (photoHeight * capturedPhotos.length) + 30;
                      ctx.fillStyle = '#8b4513';
                      ctx.font = 'italic 16px "Dancing Script", cursive';
                      ctx.textAlign = 'center';

                      // Word wrap the note
                      const words = photoNote.split(' ');
                      const lines = [];
                      let currentLine = '';

                      words.forEach(word => {
                        const testLine = currentLine + (currentLine ? ' ' : '') + word;
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > photoWidth - 20 && currentLine) {
                          lines.push(currentLine);
                          currentLine = word;
                        } else {
                          currentLine = testLine;
                        }
                      });
                      if (currentLine) lines.push(currentLine);

                      lines.forEach((line, lineIndex) => {
                        ctx.fillText(`"${line}"`, canvas.width / 2, noteY + (lineIndex * 20));
                      });
                    }

                    // All images loaded and processed, download
                    const link = document.createElement("a");
                    link.download = "vintage-photo-strip.jpg";
                    link.href = canvas.toDataURL("image/jpeg", 0.9);
                    link.click();
                  }
                };
                img.src = photoUrl;
              });
            }}
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)",
              borderRadius: "25px",
              fontSize: "clamp(14px, 3vw, 16px)",
              fontFamily: "serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 20px rgba(139, 69, 19, 0.4)",
              flex: "1 1 auto",
              minWidth: "140px",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0)";
            }}
          >
            💾 Download Strip
          </button>

          <button
            onClick={goHome}
            style={{
              backgroundColor: "transparent",
              color: "#8b4513",
              border: "3px solid #8b4513",
              padding: "clamp(9px, 2.5vw, 12px) clamp(18px, 3vw, 25px)",
              borderRadius: "25px",
              fontSize: "clamp(14px, 3vw, 16px)",
              fontFamily: "serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              flex: "1 1 auto",
              minWidth: "120px",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#8b4513";
            }}
          >
            📸 Create Another
          </button>
        </div>
      </div>
    );
  }

  if (currentView === "upload") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Decorative vintage frame corners */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            left: "30px",
            width: "50px",
            height: "50px",
            borderTop: "4px solid #8b4513",
            borderLeft: "4px solid #8b4513",
            opacity: "0.6",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: "30px",
            width: "50px",
            height: "50px",
            borderTop: "4px solid #8b4513",
            borderRight: "4px solid #8b4513",
            opacity: "0.6",
          }}
        ></div>

        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <h1
            style={{
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(32px, 8vw, 52px)",
              color: "#8b4513",
              marginBottom: "20px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(139, 69, 19, 0.2)",
            }}
          >
            Upload Your Memory 🖼️
          </h1>
          <p
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              color: "#8b4513",
              fontFamily: "serif",
              opacity: "0.8",
            }}
          >
            Transform any photo into vintage magic
          </p>
        </div>

        <div
          style={{
            border: "4px dashed #8b4513",
            borderRadius: "20px",
            padding: "80px 60px",
            textAlign: "center",
            marginBottom: "40px",
            backgroundColor: "rgba(139, 69, 19, 0.08)",
            boxShadow: "inset 0 0 20px rgba(139, 69, 19, 0.1)",
            position: "relative",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "20px",
            }}
          >
            📁
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
            id="file-input"
          />
          <label
            htmlFor="file-input"
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "18px 40px",
              borderRadius: "30px",
              fontSize: "clamp(16px, 4vw, 20px)",
              fontFamily: "serif",
              cursor: "pointer",
              display: "inline-block",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 20px rgba(139, 69, 19, 0.4)",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0)";
            }}
          >
            {loading ? "⏳ Processing..." : "✨ Choose Photo"}
          </label>

          <p
            style={{
              marginTop: "15px",
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#8b4513",
              opacity: "0.7",
              fontFamily: "serif",
            }}
          >
            Drag & drop or click to select
          </p>
        </div>

        <button
          onClick={goHome}
          style={{
            backgroundColor: "transparent",
            color: "#8b4513",
            border: "3px solid #8b4513",
            padding: "15px 35px",
            borderRadius: "30px",
            fontSize: "clamp(16px, 4vw, 20px)",
            fontFamily: "serif",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#8b4513";
            e.target.style.color = "white";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.color = "#8b4513";
          }}
        >
          ← Back Home
        </button>
      </div>
    );
  }

  if (currentView === "preview") {
    const photoToShow = capturedPhoto || uploadedPhoto;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Vintage decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "clamp(24px, 6vw, 40px)",
            opacity: "0.4",
          }}
        >
          ✨ ⭐ ✨
        </div>

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1
            style={{
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(32px, 8vw, 48px)",
              color: "#8b4513",
              marginBottom: "10px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(139, 69, 19, 0.2)",
            }}
          >
            Vintage Masterpiece! 🎭
          </h1>
          <p
            style={{
              fontFamily: "serif",
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#8b4513",
              opacity: "0.8",
            }}
          >
            Your photo, transformed by time
          </p>
        </div>

        {/* Photo with vintage card styling */}
        <div
          style={{
            backgroundColor: "white",
            padding:
              "clamp(15px, 3vw, 20px) clamp(15px, 3vw, 20px) clamp(45px, 8vw, 60px) clamp(15px, 3vw, 20px)",
            borderRadius: "15px",
            boxShadow:
              "0 20px 40px rgba(139, 69, 19, 0.3), 0 0 0 1px rgba(139, 69, 19, 0.1)",
            marginBottom: "30px",
            position: "relative",
            maxWidth: "clamp(280px, 80vw, 320px)",
            width: "100%",
          }}
        >
          <div
            style={{
              border: "3px solid #8b4513",
              borderRadius: "10px",
              overflow: "hidden",
              filter:
                "sepia(40%) contrast(1.3) brightness(1.1) saturate(0.7) hue-rotate(15deg)",
              position: "relative",
              background: "#8b4513",
            }}
          >
            <img
              src={photoToShow}
              alt="Vintage photo"
              style={{
                width: "100%",
                height: "clamp(140px, 35vw, 180px)",
                objectFit: "cover",
                display: "block",
              }}
            />
            {/* Vintage film grain overlay */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background:
                  "radial-gradient(circle, transparent 40%, rgba(139, 69, 19, 0.1) 100%)",
                pointerEvents: "none",
              }}
            ></div>
          </div>

          {/* Note area at bottom of card */}
          <div
            style={{
              position: "absolute",
              bottom: "15px",
              left: "20px",
              right: "20px",
              textAlign: "center",
            }}
          >
            {photoNote ? (
              <p
                style={{
                  fontFamily: "Dancing Script, cursive",
                  fontSize: "clamp(12px, 3vw, 16px)",
                  color: "#8b4513",
                  fontStyle: "italic",
                  margin: "0",
                  lineHeight: "1.3",
                }}
              >
                "{photoNote}"
              </p>
            ) : (
              <p
                style={{
                  fontFamily: "serif",
                  fontSize: "clamp(10px, 2.5vw, 12px)",
                  color: "#8b4513",
                  opacity: "0.5",
                  margin: "0",
                  fontStyle: "italic",
                }}
              >
                Add a note to remember this moment...
              </p>
            )}
          </div>
        </div>

        {/* Note input */}
        <div
          style={{
            marginBottom: "30px",
            width: "100%",
            maxWidth: "clamp(280px, 80vw, 320px)",
            textAlign: "center",
          }}
        >
          <textarea
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            placeholder="Write your thoughts about this photo..."
            maxLength={120}
            style={{
              width: "100%",
              padding: "clamp(10px, 2vw, 12px)",
              borderRadius: "15px",
              border: "2px solid #8b4513",
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(12px, 3vw, 14px)",
              color: "#8b4513",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              resize: "none",
              height: "clamp(50px, 12vw, 60px)",
              boxShadow: "inset 0 2px 5px rgba(139, 69, 19, 0.1)",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#a0522d";
              e.target.style.boxShadow =
                "inset 0 2px 5px rgba(139, 69, 19, 0.2), 0 0 0 3px rgba(139, 69, 19, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#8b4513";
              e.target.style.boxShadow =
                "inset 0 2px 5px rgba(139, 69, 19, 0.1)";
            }}
          />
          <p
            style={{
              fontSize: "clamp(9px, 2vw, 11px)",
              color: "#8b4513",
              opacity: "0.6",
              marginTop: "5px",
              fontFamily: "serif",
            }}
          >
            {photoNote.length}/120 characters
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(15px, 4vw, 20px)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              // Create a canvas to render the complete vintage photo with styling
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              // Set canvas dimensions to match the vintage card
              const photoWidth = 320;
              const photoHeight = 240;
              const cardPadding = 20;
              const noteHeight = photoNote ? 80 : 40;

              canvas.width = photoWidth + (cardPadding * 2);
              canvas.height = photoHeight + (cardPadding * 2) + noteHeight;

              // Draw vintage paper background
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#f5f1eb');
              gradient.addColorStop(1, '#e8dcc0');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Add subtle paper texture
              ctx.fillStyle = 'rgba(139, 69, 19, 0.03)';
              for (let i = 0; i < 150; i++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
              }

              // Draw white card background
              ctx.fillStyle = 'white';
              ctx.shadowColor = 'rgba(139, 69, 19, 0.3)';
              ctx.shadowBlur = 20;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 10;
              ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
              ctx.shadowColor = 'transparent';

              // Load and process the photo
              const img = new Image();
              img.onload = () => {
                // Draw brown border around photo
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(cardPadding - 3, cardPadding - 3, photoWidth + 6, photoHeight + 6);

                // Create temporary canvas for vintage effect processing
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = photoWidth;
                tempCanvas.height = photoHeight;

                // Draw image to temp canvas
                tempCtx.drawImage(img, 0, 0, photoWidth, photoHeight);

                // Apply vintage sepia effect
                const imageData = tempCtx.getImageData(0, 0, photoWidth, photoHeight);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];

                  // Enhanced sepia formula with vintage adjustments
                  data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189)) * 1.3; // Red
                  data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)) * 1.1; // Green
                  data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)) * 0.7; // Blue
                }

                tempCtx.putImageData(imageData, 0, 0);

                // Draw the processed image to main canvas
                ctx.drawImage(tempCanvas, cardPadding, cardPadding);

                // Add vintage vignette overlay
                const vignetteGradient = ctx.createRadialGradient(
                  cardPadding + photoWidth/2, cardPadding + photoHeight/2, 0,
                  cardPadding + photoWidth/2, cardPadding + photoHeight/2, Math.max(photoWidth, photoHeight)/2
                );
                vignetteGradient.addColorStop(0, 'rgba(139, 69, 19, 0)');
                vignetteGradient.addColorStop(0.4, 'rgba(139, 69, 19, 0)');
                vignetteGradient.addColorStop(1, 'rgba(139, 69, 19, 0.1)');
                ctx.fillStyle = vignetteGradient;
                ctx.fillRect(cardPadding, cardPadding, photoWidth, photoHeight);

                // Add note if it exists
                if (photoNote) {
                  const noteY = cardPadding + photoHeight + 40;
                  ctx.fillStyle = '#8b4513';
                  ctx.font = 'italic 18px "Dancing Script", cursive';
                  ctx.textAlign = 'center';

                  // Word wrap the note
                  const words = photoNote.split(' ');
                  const lines = [];
                  let currentLine = '';

                  words.forEach(word => {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > photoWidth - 40 && currentLine) {
                      lines.push(currentLine);
                      currentLine = word;
                    } else {
                      currentLine = testLine;
                    }
                  });
                  if (currentLine) lines.push(currentLine);

                  lines.forEach((line, lineIndex) => {
                    ctx.fillText(`"${line}"`, canvas.width / 2, noteY + (lineIndex * 22));
                  });
                }

                // Download the complete vintage photo
                const link = document.createElement("a");
                link.download = "vintage-photo.jpg";
                link.href = canvas.toDataURL("image/jpeg", 0.9);
                link.click();
              };
              img.src = photoToShow;
            }}
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)",
              borderRadius: "30px",
              fontSize: "clamp(14px, 3vw, 16px)",
              fontFamily: "serif",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-block",
              transition: "all 0.3s ease",
              boxShadow: "0 6px 20px rgba(139, 69, 19, 0.4)",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-3px)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0)";
            }}
          >
            💾 Download Photo
          </button>

          <button
            onClick={goHome}
            style={{
              backgroundColor: "transparent",
              color: "#8b4513",
              border: "3px solid #8b4513",
              padding: "clamp(9px, 2.5vw, 12px) clamp(18px, 3vw, 25px)",
              borderRadius: "30px",
              fontSize: "clamp(14px, 3vw, 16px)",
              fontFamily: "serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#8b4513";
            }}
          >
            📸 Create Another
          </button>
        </div>
      </div>
    );
  }

  if (currentView === "camera") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Decorative elements - hide on very small screens */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            width: "clamp(40px, 8vw, 60px)",
            height: "clamp(40px, 8vw, 60px)",
            border: "3px solid #8b4513",
            borderRadius: "50%",
            opacity: "0.3",
            display: windowWidth < 480 ? "none" : "block",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "clamp(30px, 6vw, 40px)",
            height: "clamp(30px, 6vw, 40px)",
            border: "2px solid #8b4513",
            transform: "rotate(45deg)",
            opacity: "0.3",
            display: windowWidth < 480 ? "none" : "block",
          }}
        ></div>

        <div
          style={{ textAlign: "center", marginBottom: "30px", maxWidth: "90%" }}
        >
          <h1
            style={{
              fontFamily: "Dancing Script, cursive",
              fontSize: "clamp(28px, 7vw, 48px)",
              color: "#8b4513",
              marginBottom: "10px",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(139, 69, 19, 0.2)",
            }}
          >
            {photoStripMode
              ? `Photo ${currentPhotoIndex + 1} of ${selectedPhotoCount}`
              : "Say Cheese!"}{" "}
            📸
          </h1>
          <p
            style={{
              fontFamily: "serif",
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#8b4513",
              opacity: "0.8",
            }}
          >
            {countdown
              ? `Get ready... ${countdown}!`
              : cameraReady
              ? photoStripMode
                ? "Strike your pose for the strip!"
                : "Strike your best vintage pose"
              : "Setting up camera..."}
          </p>
          {photoStripMode && capturedPhotos.length > 0 && (
            <p
              style={{
                fontFamily: "serif",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                color: "#8b4513",
                opacity: "0.6",
                marginTop: "5px",
              }}
            >
              {capturedPhotos.length} photo
              {capturedPhotos.length > 1 ? "s" : ""} captured ✨
            </p>
          )}
        </div>

        <div
          style={{
            position: "relative",
            border: "clamp(8px, 2vw, 12px) solid #8b4513",
            borderRadius: "20px",
            overflow: "hidden",
            marginBottom: "30px",
            boxShadow:
              "0 15px 35px rgba(139, 69, 19, 0.4), inset 0 0 20px rgba(139, 69, 19, 0.1)",
            background: "#000",
            width: "100%",
            maxWidth: "clamp(300px, 80vw, 400px)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "clamp(225px, 60vw, 300px)",
              objectFit: "cover",
              display: "block",
              backgroundColor: "#000",
              transform: "scaleX(-1)", // Mirror the video preview
            }}
          />
          {/* Loading overlay */}
          {!cameraReady && (
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "clamp(16px, 4vw, 18px)",
                fontFamily: "serif",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "clamp(24px, 6vw, 32px)",
                    marginBottom: "10px",
                  }}
                >
                  📷
                </div>
                <div>Loading camera...</div>
              </div>
            </div>
          )}
          {/* Countdown overlay */}
          {countdown && (
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background: "rgba(139, 69, 19, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "clamp(60px, 20vw, 120px)",
                fontFamily: "Dancing Script, cursive",
                fontWeight: "bold",
                textShadow: "4px 4px 8px rgba(0, 0, 0, 0.5)",
                animation: "pulse 1s ease-in-out",
              }}
            >
              {countdown}
            </div>
          )}
          {/* Vintage overlay */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background:
                "radial-gradient(circle, transparent 60%, rgba(139, 69, 19, 0.1) 100%)",
              pointerEvents: "none",
            }}
          ></div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(15px, 4vw, 20px)",
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <button
            onClick={startCountdown}
            disabled={!cameraReady || countdown !== null}
            style={{
              backgroundColor:
                cameraReady && countdown === null ? "#8b4513" : "#ccc",
              color: "white",
              border: "none",
              padding: "clamp(15px, 3vw, 18px) clamp(25px, 5vw, 35px)",
              borderRadius: "30px",
              fontSize: "clamp(14px, 3vw, 18px)",
              fontFamily: "serif",
              cursor:
                cameraReady && countdown === null ? "pointer" : "not-allowed",
              transition: "all 0.3s ease",
              boxShadow:
                cameraReady && countdown === null
                  ? "0 6px 20px rgba(139, 69, 19, 0.4)"
                  : "none",
              position: "relative",
              overflow: "hidden",
              opacity: cameraReady && countdown === null ? 1 : 0.6,
              flex: "1 1 auto",
              minWidth: "180px",
            }}
            onMouseOver={(e) => {
              if (cameraReady && countdown === null) {
                e.target.style.backgroundColor = "#a0522d";
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 8px 25px rgba(139, 69, 19, 0.5)";
              }
            }}
            onMouseOut={(e) => {
              if (cameraReady && countdown === null) {
                e.target.style.backgroundColor = "#8b4513";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 6px 20px rgba(139, 69, 19, 0.4)";
              }
            }}
          >
            📷{" "}
            {countdown
              ? `Taking photo in ${countdown}...`
              : cameraReady
              ? "Capture Photo (3s timer)"
              : "Please Wait..."}
          </button>

          <button
            onClick={goHome}
            disabled={countdown !== null}
            style={{
              backgroundColor: "transparent",
              color: countdown !== null ? "#ccc" : "#8b4513",
              border: `3px solid ${countdown !== null ? "#ccc" : "#8b4513"}`,
              padding: "clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)",
              borderRadius: "30px",
              fontSize: "clamp(14px, 3vw, 18px)",
              fontFamily: "serif",
              cursor: countdown !== null ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              opacity: countdown !== null ? 0.5 : 1,
              flex: "1 1 auto",
              minWidth: "120px",
            }}
            onMouseOver={(e) => {
              if (countdown === null) {
                e.target.style.backgroundColor = "#8b4513";
                e.target.style.color = "white";
              }
            }}
            onMouseOut={(e) => {
              if (countdown === null) {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#8b4513";
              }
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f1eb 0%, #e8dcc0 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative vintage elements - responsive */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          width: "clamp(50px, 10vw, 80px)",
          height: "clamp(50px, 10vw, 80px)",
          border: "3px solid #8b4513",
          borderRadius: "50%",
          opacity: "0.2",
          animation: "float 6s ease-in-out infinite",
          display: windowWidth < 480 ? "none" : "block",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "15%",
          width: "clamp(40px, 8vw, 60px)",
          height: "clamp(40px, 8vw, 60px)",
          border: "2px solid #8b4513",
          transform: "rotate(45deg)",
          opacity: "0.2",
          animation: "float 8s ease-in-out infinite reverse",
          display: windowWidth < 480 ? "none" : "block",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "20%",
          fontSize: "clamp(24px, 6vw, 40px)",
          opacity: "0.1",
          animation: "float 10s ease-in-out infinite",
          display: windowWidth < 480 ? "none" : "block",
        }}
      >
        📷
      </div>

      {/* About link in top right */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          right: "30px",
          display: windowWidth < 480 ? "none" : "block",
        }}
      >
        <a
          href="#"
          style={{
            color: "#8b4513",
            textDecoration: "none",
            fontSize: "clamp(14px, 3vw, 18px)",
            fontFamily: "serif",
            opacity: "0.8",
            transition: "opacity 0.3s ease",
          }}
          onMouseOver={(e) => (e.target.style.opacity = "1")}
          onMouseOut={(e) => (e.target.style.opacity = "0.8")}
        >
          <i className="fas fa-info-circle" style={{ marginRight: "8px" }}></i>
          About
        </a>
      </div>

      {/* Main content */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "clamp(40px, 10vw, 80px)",
          zIndex: "1",
          maxWidth: "90%",
        }}
      >
        <div
          style={{
            marginBottom: "30px",
            fontSize: "clamp(40px, 10vw, 60px)",
            opacity: "0.8",
          }}
        >
          📸✨
        </div>

        <h1
          style={{
            fontFamily: "Dancing Script, cursive",
            fontSize: "clamp(48px, 12vw, 84px)",
            color: "#8b4513",
            marginBottom: "20px",
            fontWeight: "bold",
            lineHeight: "1.1",
            textShadow: "3px 3px 6px rgba(139, 69, 19, 0.3)",
            letterSpacing: "-2px",
          }}
        >
          Vintage Photobooth
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 4vw, 22px)",
            color: "#8b4513",
            fontFamily: "serif",
            marginBottom: "50px",
            opacity: "0.8",
            fontStyle: "italic",
          }}
        >
          Step back in time • Create timeless memories
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(20px, 4vw, 25px)",
            alignItems: "center",
            width: "100%",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          <button
            onClick={handlePhotoStrip}
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "clamp(18px, 4vw, 22px) clamp(35px, 8vw, 50px)",
              borderRadius: "35px",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontFamily: "serif",
              cursor: "pointer",
              width: "100%",
              maxWidth: "280px",
              transition: "all 0.4s ease",
              boxShadow: "0 8px 25px rgba(139, 69, 19, 0.4)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-4px) scale(1.02)";
              e.target.style.boxShadow = "0 12px 35px rgba(139, 69, 19, 0.5)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0) scale(1)";
              e.target.style.boxShadow = "0 8px 25px rgba(139, 69, 19, 0.4)";
            }}
          >
            📸 Photo Strip
          </button>

          <button
            onClick={handleUploadPhotos}
            style={{
              backgroundColor: "#8b4513",
              color: "white",
              border: "none",
              padding: "clamp(18px, 4vw, 22px) clamp(35px, 8vw, 50px)",
              borderRadius: "35px",
              fontSize: "clamp(18px, 4vw, 22px)",
              fontFamily: "serif",
              cursor: "pointer",
              width: "100%",
              maxWidth: "280px",
              transition: "all 0.4s ease",
              boxShadow: "0 8px 25px rgba(139, 69, 19, 0.4)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#a0522d";
              e.target.style.transform = "translateY(-4px) scale(1.02)";
              e.target.style.boxShadow = "0 12px 35px rgba(139, 69, 19, 0.5)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#8b4513";
              e.target.style.transform = "translateY(0) scale(1)";
              e.target.style.boxShadow = "0 8px 25px rgba(139, 69, 19, 0.4)";
            }}
          >
            🖼️ Upload Photos
          </button>
        </div>
      </div>

      {/* Bottom text */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#8b4513",
            fontSize: "clamp(12px, 3vw, 16px)",
            fontFamily: "serif",
            opacity: "0.7",
          }}
        >
          ✨ Creating memories since forever ✨
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#d32f2f",
            color: "white",
            padding: "15px 25px",
            borderRadius: "10px",
            zIndex: 1000,
            boxShadow: "0 4px 15px rgba(211, 47, 47, 0.3)",
            fontFamily: "serif",
            fontSize: "clamp(12px, 3vw, 14px)",
            maxWidth: "90%",
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "15px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default MainComponent;