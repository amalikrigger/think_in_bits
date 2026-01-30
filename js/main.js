/**
 * Think In Bits - Shared JavaScript Module
 * 
 * This file contains shared functionality for all pages:
 * - Mobile hamburger menu toggle
 * - Smooth scroll for anchor links
 * - Active navigation link highlighting
 * - Scroll-based navbar background effect
 * 
 * Pure vanilla JavaScript - no dependencies
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ============================================
  // 1. MOBILE NAVIGATION TOGGLE
  // ============================================
  // Handles hamburger menu for mobile devices
  // Toggles 'active' class on hamburger button and nav-links container
  
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    // Toggle menu open/close when hamburger is clicked
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    
    // Close menu when any nav link is clicked
    // This ensures smooth UX especially for anchor links on same page
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
    
    // Close menu when clicking outside of navigation
    document.addEventListener('click', function(event) {
      const isClickInsideNav = navLinks.contains(event.target);
      const isClickOnHamburger = hamburger.contains(event.target);
      
      // If click is outside nav and hamburger, close the menu
      if (!isClickInsideNav && !isClickOnHamburger && navLinks.classList.contains('active')) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      }
    });
  }
  
  // ============================================
  // 2. SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================
  // Provides smooth scrolling behavior for all anchor links (href starting with #)
  // Accounts for fixed navbar height to prevent content hiding behind navbar
  
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      // Skip if href is just "#" (often used for placeholder links)
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        
        // Get navbar height for offset calculation
        // This prevents the target section from hiding behind fixed navbar
        const navbar = document.querySelector('.navbar');
        const navHeight = navbar ? navbar.offsetHeight : 0;
        
        // Calculate target scroll position
        // Using getBoundingClientRect for accurate positioning relative to viewport
        // Adding window.pageYOffset to convert to absolute document position
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        // Perform smooth scroll
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // ============================================
  // 3. ACTIVE NAVIGATION LINK HIGHLIGHTING
  // ============================================
  // Highlights the current page's nav link by adding 'active' class
  // Uses location.pathname to determine which page is currently active
  
  // Get current page filename from URL path
  // Defaults to 'index.html' if no filename is present (e.g., at root "/")
  const currentPath = location.pathname;
  const currentPage = currentPath.split('/').pop() || 'index.html';
  
  // Find and mark the matching nav link as active
  document.querySelectorAll('.nav-link').forEach(function(link) {
    const linkHref = link.getAttribute('href');
    
    // Check if link href matches current page
    // Also handle the case where link might be just the filename
    if (linkHref === currentPage || linkHref === './' + currentPage) {
      link.classList.add('active');
    }
    
    // Handle root path matching index.html
    if ((currentPage === '' || currentPage === 'index.html') && 
        (linkHref === 'index.html' || linkHref === './' || linkHref === '/')) {
      link.classList.add('active');
    }
  });
  
  // ============================================
  // 4. SCROLL-BASED NAVBAR BACKGROUND
  // ============================================
  // Adds 'scrolled' class to navbar when user scrolls past threshold
  // This allows CSS to apply different styles (e.g., solid background, shadow)
  // Threshold: 50px from top
  
  const navbar = document.querySelector('.navbar');
  const SCROLL_THRESHOLD = 50;
  
  if (navbar) {
    // Check scroll position and update navbar class
    function updateNavbarOnScroll() {
      if (window.scrollY > SCROLL_THRESHOLD) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
    
    // Listen for scroll events
    window.addEventListener('scroll', updateNavbarOnScroll);
    
    // Also check on page load in case page loads already scrolled
    updateNavbarOnScroll();
  }
  
});
