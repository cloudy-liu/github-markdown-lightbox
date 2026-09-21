// ==UserScript==
// @name         GitHub Markdown Image Lightbox
// @namespace    local.github-markdown-image-lightbox
// @version      0.1.0
// @description  Preview Markdown images on GitHub in a lightbox with zoom, pan, and keyboard navigation.
// @author       cloudy
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        GM_addStyle
// @run-at       document-idle
// @noframes
// @license      MIT
// ==/UserScript==

(function githubMarkdownImageLightbox() {
  'use strict';

  const CONTENT_IMAGE_SELECTOR = '.markdown-body img';
  const ELIGIBLE_IMAGE_ATTRIBUTE = 'data-gmil-eligible';
  const KEYBOARD_ENABLED_ATTRIBUTE = 'data-gmil-keyboard-enabled';
  const MANAGED_ACCESSIBILITY_ATTRIBUTE = 'data-gmil-managed-accessibility';
  const INITIALIZED_ATTRIBUTE = 'data-gmil-initialized';
  const ROOT_OPEN_CLASS = 'gmil-lightbox-open';

  const MIN_IMAGE_DIMENSION = 200;
  const MAX_ZOOM_SCALE = 8;
  const ZOOM_STEP = 1.15;
  const IMAGE_REFRESH_DELAY_MS = 150;
  const IMAGE_FILE_EXTENSION_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;

  const DEFAULT_HINT = 'Mouse wheel: zoom | Drag: pan | Esc: close | Left/Right: navigate';
  const LOAD_ERROR_HINT = 'The image could not be loaded. Use Left/Right to continue.';

  const EXCLUDED_IMAGE_CLASSES = [
    'avatar',
    'emoji',
    'octicon',
    'octicon-logo',
  ];

  const BADGE_URL_MARKERS = [
    'shields.io',
    'badge.fury.io',
    'badgen.net',
    'travis-ci.org',
    'codecov.io',
    'coveralls.io',
    'gitter.im',
    'opencollective.com',
  ];

  let contentImages = [];
  let currentImageIndex = -1;
  let lightboxElements = null;
  let previouslyFocusedElement = null;
  let refreshTimerId = null;
  let activationFrameId = null;
  let currentPageUrl = window.location.href;

  let zoomScale = 1;
  let translationX = 0;
  let translationY = 0;

  let activePointerId = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let translationStartX = 0;
  let translationStartY = 0;

  if (document.documentElement.hasAttribute(INITIALIZED_ATTRIBUTE)) {
    return;
  }
  document.documentElement.setAttribute(INITIALIZED_ATTRIBUTE, '');

  GM_addStyle(`
    html.${ROOT_OPEN_CLASS},
    html.${ROOT_OPEN_CLASS} body {
      overflow: hidden !important;
    }

    .markdown-body img[${ELIGIBLE_IMAGE_ATTRIBUTE}] {
      cursor: zoom-in !important;
    }

    .gmil-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      background: rgb(0 0 0 / 85%);
      cursor: zoom-out;
      transition: opacity 0.25s ease, visibility 0s linear 0.25s;
    }

    .gmil-overlay.gmil-is-active {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
      transition-delay: 0s;
    }

    .gmil-image {
      max-width: 90vw;
      max-height: 88vh;
      border-radius: 8px;
      box-shadow: 0 0 40px rgb(0 0 0 / 60%);
      object-fit: contain;
      user-select: none;
      touch-action: none;
      transform-origin: center;
      cursor: zoom-out;
      transition: transform 0.12s ease;
      -webkit-user-drag: none;
    }

    .gmil-image.gmil-is-zoomed {
      cursor: grab;
      transition: none;
    }

    .gmil-image.gmil-is-dragging {
      cursor: grabbing;
      transition: none;
    }

    .gmil-button {
      position: fixed;
      z-index: 100001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 50%;
      color: #fff;
      background: rgb(255 255 255 / 12%);
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .gmil-button:hover {
      background: rgb(255 255 255 / 25%);
    }

    .gmil-button:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    .gmil-close {
      top: 20px;
      right: 28px;
      width: 44px;
      height: 44px;
      font-size: 24px;
      line-height: 1;
    }

    .gmil-counter,
    .gmil-hint {
      position: fixed;
      left: 50%;
      z-index: 100001;
      color: rgb(255 255 255 / 70%);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      pointer-events: none;
      transform: translateX(-50%);
    }

    .gmil-counter {
      top: 28px;
      font-size: 14px;
    }

    .gmil-hint {
      bottom: 24px;
      max-width: min(90vw, 720px);
      color: rgb(255 255 255 / 55%);
      font-size: 12px;
      text-align: center;
    }

    .gmil-nav {
      top: 50%;
      width: 52px;
      height: 52px;
      font-size: 28px;
      transform: translateY(-50%);
    }

    .gmil-previous {
      left: 28px;
    }

    .gmil-next {
      right: 28px;
    }

    .gmil-button[hidden] {
      display: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .gmil-overlay,
      .gmil-image,
      .gmil-button {
        transition: none;
      }
    }
  `);

  function hasExcludedClass(image) {
    return EXCLUDED_IMAGE_CLASSES.some((className) => image.classList.contains(className));
  }

  function isBadgeImage(image) {
    const sourceUrls = [
      image.currentSrc,
      image.src,
      image.getAttribute('data-canonical-src'),
    ].filter(Boolean);

    return sourceUrls.some((url) => (
      BADGE_URL_MARKERS.some((marker) => url.toLowerCase().includes(marker))
    ));
  }

  function isSmallImage(image) {
    const { naturalWidth, naturalHeight } = image;
    if (naturalWidth === 0 || naturalHeight === 0) {
      return false;
    }

    return naturalWidth < MIN_IMAGE_DIMENSION && naturalHeight < MIN_IMAGE_DIMENSION;
  }

  function resolveImageSource(image, anchor) {
    const renderedSource = image.currentSrc || image.src;
    const anchorHref = anchor?.getAttribute('href');

    if (!anchorHref) {
      return renderedSource;
    }

    try {
      const linkedUrl = new URL(anchorHref, window.location.href);
      const isGitHubBlobUrl = linkedUrl.origin === window.location.origin
        && linkedUrl.pathname.includes('/blob/')
        && IMAGE_FILE_EXTENSION_PATTERN.test(linkedUrl.pathname);

      if (isGitHubBlobUrl) {
        linkedUrl.pathname = linkedUrl.pathname.replace('/blob/', '/raw/');
        return linkedUrl.href;
      }
    } catch {
      // Keep the rendered source when the link is not a valid URL.
    }

    // GitHub proxies external images through camo.githubusercontent.com.
    // Keep that URL because GitHub's Content Security Policy blocks arbitrary image hosts.
    return renderedSource;
  }

  function createImageRecord(image) {
    if (hasExcludedClass(image) || isBadgeImage(image) || isSmallImage(image)) {
      return null;
    }

    const anchor = image.closest('a');
    const sourceUrl = resolveImageSource(image, anchor);

    if (!sourceUrl) {
      return null;
    }

    return {
      element: image,
      sourceUrl,
      altText: image.alt || '',
    };
  }

  function updateImageAccessibility(image, isEligible) {
    const hasInteractiveParent = Boolean(image.closest('a, button'));
    const shouldEnableKeyboard = isEligible && !hasInteractiveParent;

    if (shouldEnableKeyboard) {
      if (image.hasAttribute(KEYBOARD_ENABLED_ATTRIBUTE)) {
        return;
      }

      const accessibilityAttributes = {
        tabindex: '0',
        role: 'button',
        'aria-haspopup': 'dialog',
        'aria-label': image.alt ? `Open image preview: ${image.alt}` : 'Open image preview',
      };
      const managedAttributes = [];

      Object.entries(accessibilityAttributes).forEach(([name, value]) => {
        if (!image.hasAttribute(name)) {
          image.setAttribute(name, value);
          managedAttributes.push(name);
        }
      });

      image.setAttribute(KEYBOARD_ENABLED_ATTRIBUTE, '');
      image.setAttribute(MANAGED_ACCESSIBILITY_ATTRIBUTE, managedAttributes.join(','));
      return;
    }

    if (!image.hasAttribute(KEYBOARD_ENABLED_ATTRIBUTE)) {
      return;
    }

    const managedAttributes = image
      .getAttribute(MANAGED_ACCESSIBILITY_ATTRIBUTE)
      ?.split(',')
      .filter(Boolean) ?? [];

    managedAttributes.forEach((name) => image.removeAttribute(name));
    image.removeAttribute(MANAGED_ACCESSIBILITY_ATTRIBUTE);
    image.removeAttribute(KEYBOARD_ENABLED_ATTRIBUTE);
  }

  function refreshContentImages() {
    const discoveredImages = document.querySelectorAll(CONTENT_IMAGE_SELECTOR);
    const nextContentImages = [];

    discoveredImages.forEach((image) => {
      const imageRecord = createImageRecord(image);
      const isEligible = Boolean(imageRecord);
      image.toggleAttribute(ELIGIBLE_IMAGE_ATTRIBUTE, isEligible);
      updateImageAccessibility(image, isEligible);

      if (imageRecord) {
        nextContentImages.push(imageRecord);
      }
    });

    contentImages = nextContentImages;
  }

  function scheduleImageRefresh() {
    window.clearTimeout(refreshTimerId);
    refreshTimerId = window.setTimeout(() => {
      refreshTimerId = null;
      refreshContentImages();
    }, IMAGE_REFRESH_DELAY_MS);
  }

  function createButton(classNames, text, accessibleLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gmil-button ${classNames}`;
    button.textContent = text;
    button.setAttribute('aria-label', accessibleLabel);
    button.title = accessibleLabel;
    return button;
  }

  function buildLightbox() {
    const overlay = document.createElement('div');
    overlay.className = 'gmil-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image preview');
    overlay.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = 'gmil-image';
    image.draggable = false;
    image.decoding = 'async';

    const closeButton = createButton('gmil-close', '\u00d7', 'Close image preview (Escape)');
    const previousButton = createButton('gmil-nav gmil-previous', '\u2039', 'Previous image (Left arrow)');
    const nextButton = createButton('gmil-nav gmil-next', '\u203a', 'Next image (Right arrow)');

    const counter = document.createElement('div');
    counter.className = 'gmil-counter';
    counter.setAttribute('aria-live', 'polite');

    const hint = document.createElement('div');
    hint.className = 'gmil-hint';
    hint.textContent = DEFAULT_HINT;
    hint.setAttribute('role', 'status');
    hint.setAttribute('aria-live', 'polite');

    overlay.append(image, closeButton, counter, hint, previousButton, nextButton);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeLightbox();
      }
    });

    image.addEventListener('click', (event) => {
      event.stopPropagation();
      if (zoomScale === 1) {
        closeLightbox();
      }
    });

    image.addEventListener('load', () => {
      hint.textContent = DEFAULT_HINT;
    });

    image.addEventListener('error', () => {
      hint.textContent = LOAD_ERROR_HINT;
    });

    image.addEventListener('wheel', handleImageWheel, { passive: false });
    image.addEventListener('pointerdown', handlePointerDown);
    image.addEventListener('pointermove', handlePointerMove);
    image.addEventListener('pointerup', handlePointerEnd);
    image.addEventListener('pointercancel', handlePointerEnd);

    closeButton.addEventListener('click', closeLightbox);
    previousButton.addEventListener('click', () => showAdjacentImage(-1));
    nextButton.addEventListener('click', () => showAdjacentImage(1));

    lightboxElements = {
      overlay,
      image,
      closeButton,
      previousButton,
      nextButton,
      counter,
      hint,
    };
  }

  function isLightboxOpen() {
    return lightboxElements?.overlay.getAttribute('aria-hidden') === 'false';
  }

  function applyImageTransform() {
    if (!lightboxElements) {
      return;
    }

    const { image } = lightboxElements;
    image.style.transform = `translate(${translationX}px, ${translationY}px) scale(${zoomScale})`;
    image.classList.toggle('gmil-is-zoomed', zoomScale > 1);
  }

  function resetImageTransform() {
    zoomScale = 1;
    translationX = 0;
    translationY = 0;
    activePointerId = null;

    if (lightboxElements) {
      lightboxElements.image.classList.remove('gmil-is-dragging');
    }

    applyImageTransform();
  }

  function displayCurrentImage() {
    const imageRecord = contentImages[currentImageIndex];
    if (!imageRecord || !lightboxElements) {
      return;
    }

    const {
      image,
      counter,
      hint,
      previousButton,
      nextButton,
    } = lightboxElements;

    hint.textContent = DEFAULT_HINT;
    image.alt = imageRecord.altText;
    image.src = imageRecord.sourceUrl;

    const hasMultipleImages = contentImages.length > 1;
    counter.textContent = hasMultipleImages
      ? `${currentImageIndex + 1} / ${contentImages.length}`
      : '';
    previousButton.hidden = !hasMultipleImages;
    nextButton.hidden = !hasMultipleImages;
  }

  function openLightbox(index) {
    if (!lightboxElements) {
      buildLightbox();
    }

    currentImageIndex = index;
    previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    resetImageTransform();
    displayCurrentImage();

    const { overlay, closeButton } = lightboxElements;
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add(ROOT_OPEN_CLASS);

    window.cancelAnimationFrame(activationFrameId);
    activationFrameId = window.requestAnimationFrame(() => {
      activationFrameId = null;
      if (!isLightboxOpen()) {
        return;
      }

      overlay.classList.add('gmil-is-active');
      closeButton.focus({ preventScroll: true });
    });
  }

  function closeLightbox() {
    if (!lightboxElements || !isLightboxOpen()) {
      return;
    }

    window.cancelAnimationFrame(activationFrameId);
    activationFrameId = null;
    lightboxElements.overlay.classList.remove('gmil-is-active');
    document.documentElement.classList.remove(ROOT_OPEN_CLASS);
    resetImageTransform();

    if (previouslyFocusedElement?.isConnected) {
      previouslyFocusedElement.focus({ preventScroll: true });
    }

    lightboxElements.overlay.setAttribute('aria-hidden', 'true');
    previouslyFocusedElement = null;
    currentImageIndex = -1;
  }

  function showAdjacentImage(offset) {
    if (contentImages.length === 0) {
      return;
    }

    currentImageIndex = (
      currentImageIndex + offset + contentImages.length
    ) % contentImages.length;

    resetImageTransform();
    displayCurrentImage();
  }

  function handleImageWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY === 0 || !lightboxElements) {
      return;
    }

    const zoomFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const nextZoomScale = Math.min(MAX_ZOOM_SCALE, Math.max(1, zoomScale * zoomFactor));

    if (nextZoomScale === zoomScale) {
      return;
    }

    if (nextZoomScale === 1) {
      resetImageTransform();
      return;
    }

    const imageBounds = lightboxElements.image.getBoundingClientRect();
    const imageCenterX = imageBounds.left + imageBounds.width / 2;
    const imageCenterY = imageBounds.top + imageBounds.height / 2;
    const pointerOffsetX = event.clientX - imageCenterX;
    const pointerOffsetY = event.clientY - imageCenterY;
    const scaleRatio = nextZoomScale / zoomScale;

    translationX += pointerOffsetX * (1 - scaleRatio);
    translationY += pointerOffsetY * (1 - scaleRatio);
    zoomScale = nextZoomScale;
    applyImageTransform();
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || zoomScale === 1 || !lightboxElements) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    translationStartX = translationX;
    translationStartY = translationY;

    lightboxElements.image.setPointerCapture(event.pointerId);
    lightboxElements.image.classList.add('gmil-is-dragging');
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    event.preventDefault();
    translationX = translationStartX + event.clientX - pointerStartX;
    translationY = translationStartY + event.clientY - pointerStartY;
    applyImageTransform();
  }

  function handlePointerEnd(event) {
    if (event.pointerId !== activePointerId || !lightboxElements) {
      return;
    }

    activePointerId = null;
    lightboxElements.image.classList.remove('gmil-is-dragging');

    if (lightboxElements.image.hasPointerCapture(event.pointerId)) {
      lightboxElements.image.releasePointerCapture(event.pointerId);
    }
  }

  function trapLightboxFocus(event) {
    if (!lightboxElements) {
      return;
    }

    const focusableButtons = [
      lightboxElements.closeButton,
      lightboxElements.previousButton,
      lightboxElements.nextButton,
    ].filter((button) => !button.hidden);

    const currentFocusIndex = focusableButtons.indexOf(document.activeElement);
    const lastFocusIndex = focusableButtons.length - 1;
    const shouldWrapBackward = event.shiftKey && currentFocusIndex <= 0;
    const shouldWrapForward = !event.shiftKey
      && (currentFocusIndex === -1 || currentFocusIndex === lastFocusIndex);

    if (!shouldWrapBackward && !shouldWrapForward) {
      return;
    }

    event.preventDefault();
    const nextFocusIndex = shouldWrapBackward ? lastFocusIndex : 0;
    focusableButtons[nextFocusIndex].focus();
  }

  function handleKeyboard(event) {
    if (!isLightboxOpen()) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeLightbox();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        showAdjacentImage(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        showAdjacentImage(1);
        break;
      case '0':
        event.preventDefault();
        resetImageTransform();
        break;
      case 'Tab':
        trapLightboxFocus(event);
        break;
      default:
        break;
    }
  }

  function openContentImage(image, event) {
    refreshContentImages();
    const imageIndex = contentImages.findIndex(({ element }) => element === image);

    if (imageIndex === -1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openLightbox(imageIndex);
  }

  function findImageActivatedByClick(event) {
    if (!(event.target instanceof Element)) {
      return null;
    }

    const directlyClickedImage = event.target.closest(CONTENT_IMAGE_SELECTOR);
    if (directlyClickedImage instanceof HTMLImageElement) {
      return directlyClickedImage;
    }

    if (event.detail !== 0) {
      return null;
    }

    const activatedControl = event.target.closest('a, button');
    if (!activatedControl) {
      return null;
    }

    const controlImages = activatedControl.querySelectorAll(CONTENT_IMAGE_SELECTOR);
    return controlImages.length === 1 ? controlImages[0] : null;
  }

  function handleContentImageKeyboard(event) {
    const isActivationKey = event.key === 'Enter' || event.key === ' ';
    const image = event.target;

    if (
      !isActivationKey
      || !(image instanceof HTMLImageElement)
      || !image.hasAttribute(KEYBOARD_ENABLED_ATTRIBUTE)
    ) {
      return;
    }

    openContentImage(image, event);
  }

  function handleContentImageClick(event) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    ) {
      return;
    }

    const clickedImage = findImageActivatedByClick(event);
    if (!(clickedImage instanceof HTMLImageElement)) {
      return;
    }

    openContentImage(clickedImage, event);
  }

  function handlePageNavigation() {
    if (window.location.href !== currentPageUrl) {
      closeLightbox();
      currentPageUrl = window.location.href;
    }

    scheduleImageRefresh();
  }

  function nodeContainsMarkdownContent(node) {
    return node instanceof Element
      && (node.matches('.markdown-body') || Boolean(node.querySelector('.markdown-body')));
  }

  function mutationAffectsMarkdownContent(mutation) {
    if (mutation.target instanceof Element && mutation.target.closest('.markdown-body')) {
      return true;
    }

    return [...mutation.addedNodes, ...mutation.removedNodes]
      .some(nodeContainsMarkdownContent);
  }

  function handleContentMutations(mutations) {
    if (mutations.some(mutationAffectsMarkdownContent)) {
      scheduleImageRefresh();
    }
  }

  function initialize() {
    refreshContentImages();

    document.addEventListener('click', handleContentImageClick, true);
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('keydown', handleContentImageKeyboard);
    document.addEventListener('turbo:load', handlePageNavigation);
    document.addEventListener('pjax:end', handlePageNavigation);
    document.addEventListener('soft-nav:end', handlePageNavigation);

    const contentObserver = new MutationObserver(handleContentMutations);
    contentObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  initialize();
})();
