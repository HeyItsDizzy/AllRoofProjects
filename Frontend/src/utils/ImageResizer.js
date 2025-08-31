// src/utils/ImageResizer.js

/**
 * Resizes an image file to specified dimensions while maintaining quality
 * @param {File} file - The image file to resize
 * @param {number} maxWidth - Maximum width in pixels
 * @param {number} maxHeight - Maximum height in pixels
 * @param {number} quality - Image quality (0.1 to 1.0)
 * @returns {Promise<Blob>} - Resized image as Blob
 */
export const resizeImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Converts a blob to a File object
 * @param {Blob} blob - The blob to convert
 * @param {string} fileName - Name for the file
 * @param {string} mimeType - MIME type of the file
 * @returns {File} - File object
 */
export const blobToFile = (blob, fileName, mimeType) => {
  return new File([blob], fileName, { type: mimeType });
};

/**
 * Resizes image and returns as File object
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - Image quality
 * @returns {Promise<File>} - Resized image as File
 */
export const resizeImageAsFile = async (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  try {
    const resizedBlob = await resizeImage(file, maxWidth, maxHeight, quality);
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '_resized.' + file.name.split('.').pop();
    return blobToFile(resizedBlob, fileName, file.type);
  } catch (error) {
    throw new Error(`Failed to resize image: ${error.message}`);
  }
};

/**
 * Validates image file size and type
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {Object} - Validation result with isValid and error message
 */
export const validateImageFile = (file, maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return { isValid: false, error: `File size too large. Maximum size: ${maxSizeMB}MB` };
  }

  return { isValid: true, error: null };
};

/**
 * Generates a data URL from a file for preview
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Data URL string
 */
export const fileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses image for avatar uploads (square format)
 * @param {File} file - Original image file
 * @param {number} size - Square size (width = height)
 * @param {number} quality - Image quality
 * @returns {Promise<File>} - Compressed square image
 */
export const compressAvatarImage = async (file, size = 200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas to square dimensions
      canvas.width = size;
      canvas.height = size;

      // Calculate crop area to center the image
      const { width, height } = img;
      const minDimension = Math.min(width, height);
      const cropX = (width - minDimension) / 2;
      const cropY = (height - minDimension) / 2;

      // Draw cropped and resized image
      ctx.drawImage(
        img,
        cropX, cropY, minDimension, minDimension, // Source crop area
        0, 0, size, size // Destination area
      );

      // Convert to blob and then to file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '_avatar.' + file.name.split('.').pop();
            resolve(blobToFile(blob, fileName, file.type));
          } else {
            reject(new Error('Failed to compress avatar image'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for avatar compression'));
    };

    img.src = URL.createObjectURL(file);
  });
};
