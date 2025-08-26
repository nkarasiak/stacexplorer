/* Shared Collection JavaScript - Extracted from index.html */

// Initialize shared URL handling for collection details
document.addEventListener('DOMContentLoaded', function () {
  // Handle shared URLs for collection details
  const urlParams = new URLSearchParams(window.location.search);
  const collectionId = urlParams.get('collection');
  const source = urlParams.get('source');
  const action = urlParams.get('action');

  if (collectionId && action === 'details') {
    // Wait for app to initialize, then trigger collection details
    setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent('loadSharedCollection', {
          detail: {
            collectionId: collectionId,
            source: source,
          },
        })
      );
    }, 2000);
  }
});