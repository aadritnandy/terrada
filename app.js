document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // Tab Navigation Logic
    // -------------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link');
    const logoBtn = document.getElementById('logo-btn');
    const views = document.querySelectorAll('.view');
    const canvas = document.getElementById('hologram-canvas');

    function switchTab(tabId) {
        // Update nav links
        navLinks.forEach(link => {
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update views
        views.forEach(view => {
            if (view.id === `view-${tabId}`) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Hide/dim canvas on non-home pages to improve readability
        if (tabId === 'home') {
            canvas.style.opacity = '1';
        } else {
            canvas.style.opacity = '0.15';
        }

        // Update hash in URL without jump
        if (window.location.hash !== `#${tabId}`) {
            history.replaceState(null, null, `#${tabId}`);
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('home');
    });

    // Check URL hash on initial load
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash && document.getElementById(`view-${currentHash}`)) {
        switchTab(currentHash);
    }

    // -------------------------------------------------------------
    // Holographic Leaf Particle System
    // -------------------------------------------------------------
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles = [];
    const particleCount = 1400;

    // Green shades for holographic matrix feel
    const greenShades = [
        '#193224', // Deep Forest
        '#2a523a', // Sage Green
        '#3b604b', // Mid Green
        '#48785c', // Pale Emerald
        '#738a7c'  // Muted Green
    ];

    // Generate leaf coordinates (inside a normalized range [-1, 1])
    function generateLeafParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            // y goes from -0.8 to 0.8 (leaf base to tip)
            const y = Math.random() * 1.6 - 0.8;
            
            // Width envelope of a leaf: narrow at tip (y=0.8) and base (y=-0.8), wide in middle
            // w = (1-y)^p * (1+y)^q
            const w = Math.pow(0.8 - y, 0.75) * Math.pow(y + 0.8, 1.1) * 0.45;
            
            // Generate x within the width limit
            const x = (Math.random() * 2 - 1) * w;
            
            // Identify if the particle belongs to a vein
            // Main vein down the middle, or diagonal rib veins
            const isMainVein = Math.abs(x) < 0.015;
            
            // Diagonal vein pattern: ribs branching out at roughly 45 degrees
            const distFromCenter = Math.abs(x);
            // y_vein = slope * x + intercept
            // We check if it matches one of a few diagonal ribs
            let isRibVein = false;
            const ribsCount = 6;
            for (let r = 0; r < ribsCount; r++) {
                const ribYCenter = -0.5 + (r / ribsCount) * 1.2;
                // y - ribYCenter = slope * x
                const slope = 0.8;
                if (Math.abs((y - ribYCenter) - slope * distFromCenter) < 0.02) {
                    isRibVein = true;
                }
            }

            const isVein = isMainVein || isRibVein;

            // Random dispersion vectors (where the particle flies on scroll)
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 250 + 100;
            const dispDirX = Math.cos(angle) * speed;
            const dispDirY = Math.sin(angle) * speed;

            particles.push({
                x: x,
                y: y,
                // Start positions
                curX: (Math.random() * 2 - 1) * 0.5,
                curY: (Math.random() * 2 - 1) * 0.5,
                dispDirX,
                dispDirY,
                isVein,
                char: Math.floor(Math.random() * 10).toString(),
                color: isVein ? '#193224' : greenShades[Math.floor(Math.random() * greenShades.length)],
                size: isVein ? Math.random() * 4 + 10 : Math.random() * 4 + 8,
                pulseSpeed: Math.random() * 0.05 + 0.01,
                pulsePhase: Math.random() * Math.PI
            });
        }
    }

    // Handle Resize
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    generateLeafParticles();

    // Scroll metrics
    let scrollRatio = 0;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        // Limit scroll effect calculation to the home section height
        const maxScroll = window.innerHeight * 1.2;
        scrollRatio = Math.min(scrollTop / maxScroll, 1.0);
    });

    // Main animation loop
    function animate(time) {
        ctx.clearRect(0, 0, width, height);

        // Calculate dynamic dimensions
        const scale = Math.min(width, height) * 0.35;
        const centerX = width / 2;
        // Float the leaf slightly up or down based on screen aspect
        const centerY = height / 2;

        // Leaf rotation angle based on scroll
        const baseRotation = time * 0.0003;
        const scrollRotation = scrollRatio * Math.PI * 0.8;
        const totalRotation = baseRotation - scrollRotation;

        const cosR = Math.cos(totalRotation);
        const sinR = Math.sin(totalRotation);

        // Dispersion intensity multiplier
        // Starts growing slowly, then pushes out quickly
        const dispersionFactor = Math.pow(scrollRatio, 1.5) * 2.5;

        // Render particles
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add a subtle bloom glow to the hologram numbers
        ctx.shadowColor = 'rgba(42, 82, 58, 0.25)';
        ctx.shadowBlur = 3;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // 1. Scale normalized coordinates to pixels
            const px = p.x * scale;
            const py = p.y * scale;

            // 2. Apply Rotation
            const rx = px * cosR - py * sinR;
            const ry = px * sinR + py * cosR;

            // 3. Apply Dispersion (drifting outward from rotated shape)
            const targetX = rx + p.dispDirX * dispersionFactor;
            const targetY = ry + p.dispDirY * dispersionFactor;

            // 4. Smooth interpolation (lerping)
            p.curX += (targetX - p.curX) * 0.08;
            p.curY += (targetY - p.curY) * 0.08;

            // 5. Draw the number
            ctx.font = `${p.size}px 'Lexend', monospace`;
            
            // Subtle pulse opacity effect
            const opacity = 0.3 + Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.4;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = opacity * (1 - scrollRatio * 0.2); // slightly fade leaf as it disperses

            ctx.fillText(p.char, centerX + p.curX, centerY + p.curY);
        }

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0; // reset shadow for other canvas draws if any

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
});
