// public/script.js

// Function to adjust image sizes based on the window width
function resizeImages() {
    // Select all images inside the item-header elements
    const images = document.querySelectorAll('.item-header img');
    const windowWidth = window.innerWidth;
  
    // Loop through all images and set new dimensions
    images.forEach(image => {
      if (windowWidth < 600) {
        // For small screens, reduce image size
        image.style.width = "50px";
        image.style.height = "50px";
      } else if (windowWidth < 1024) {
        // For medium screens, use a moderate size
        image.style.width = "70px";
        image.style.height = "70px";
      } else {
        // For large screens, use the default size
        image.style.width = "320px";
        image.style.height = "320px";
      }
    });
  }
  
  // Listen for when the DOM is fully loaded
  window.addEventListener('DOMContentLoaded', resizeImages);
  // Listen for window resize events to update image sizes dynamically
  window.addEventListener('resize', resizeImages);
  