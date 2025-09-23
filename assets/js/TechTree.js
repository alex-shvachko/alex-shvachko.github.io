document.addEventListener('DOMContentLoaded', function() {
  const skills = [
    { name: "AI Art", side: "left" },
    { name: "Advanced SQL & Data Engeneering", side: "right" },
    { name: "LLM, Agentic, RAG", side: "left" },
    { name: "ETL & Data Warehousing", side: "right" },
    { name: "Advanced Prompt Engineering", side: "left" },
    { name: "Big Data, Hadoop, Spark", side: "right" },
    { name: "Time Series & Survival Analysis", side: "left" },
    { name: "Backend & APIs, No-SQL", side: "right" },
    { name: "Information Retrieval", side: "left" },
    { name: "Git & DevOps", side: "right" },
    { name: "Statistics & Machine Learning", side: "left" },
    { name: "Dashboards & Buisness Analytics", side: "right" },
  ];

  const anchor = document.getElementById('tech-tree-anchor');
  const bio = document.querySelector('.bio');
  if (!anchor && !bio) return;

  // Create container for the tech tree
  const container = document.createElement('div');
  container.className = 'tech-tree-container';

  if (anchor) {
    anchor.appendChild(container);
  } else if (bio && bio.parentNode) {
    bio.parentNode.insertBefore(container, bio.nextSibling);
  }
  
  // Calculate dynamic dimensions based on skill count
  const startY = 15; // Starting Y position for first branch
  const branchSpacing = 9; // Space between branch levels
  const extraSpace = 2; // Minimal space below the tree
  const trunkBottom = startY + branchSpacing * (skills.length - 1) + extraSpace; // End of trunk
  const trunkLength = trunkBottom - 5;
  const viewBoxHeight = trunkBottom + extraSpace; // Extra padding at bottom

  // Maintain aspect ratio space for the SVG without forcing huge viewport height
  container.style.paddingBottom = `${viewBoxHeight}%`;

  // Create SVG element with dynamic viewBox
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 100 ${viewBoxHeight}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  container.appendChild(svg);

  // Add main trunk line sized to content
  const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  trunk.setAttribute('d', `M50 5 L50 ${trunkBottom}`);
  trunk.setAttribute('stroke', '#000000');
  trunk.setAttribute('stroke-width', '0.6');
  trunk.setAttribute('fill', 'none');
  trunk.setAttribute('stroke-linecap', 'round');
  svg.appendChild(trunk);

  // Create skill branches with balanced spacing
  
  skills.forEach((skill, index) => {
    const yPos = startY + (index * branchSpacing);
    const isLeft = skill.side === 'left';
    const branchEndX = isLeft ? 15 : 85;
    const CHIP_W = 33;
    const CHIP_H = 5.4;
    const CHIP_RX = 2.7;
    const chipX = isLeft ? 2 : 100 - CHIP_W - 2;

    // Create branch
    const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    branch.setAttribute('d', `M50 ${yPos} L${branchEndX} ${yPos}`);
    branch.setAttribute('stroke', '#000000');
    branch.setAttribute('stroke-width', '0.3');
    branch.setAttribute('fill', 'none');
    branch.setAttribute('stroke-linecap', 'round');
    branch.style.strokeDasharray = '35';
    branch.style.strokeDashoffset = '35';
    svg.appendChild(branch);

    // Create dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '50');
    dot.setAttribute('cy', yPos);
    dot.setAttribute('r', '0.4');
    dot.setAttribute('fill', '#000000');
    dot.style.opacity = '0';
    // Ensure scaling occurs around the circle's own center so it stays on the branch
    dot.style.transformBox = 'fill-box';
    dot.style.transformOrigin = 'center';
    svg.appendChild(dot);

    // Create chip group
    const chipGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chipGroup.style.opacity = '0';
    chipGroup.style.transform = 'translateY(4px)';
    // Prevent scale/translate animations from shifting the group away from the branch
    chipGroup.style.transformBox = 'fill-box';
    chipGroup.style.transformOrigin = 'center';
    
    // Create chip background
    const chipBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    chipBg.setAttribute('x', chipX);
    chipBg.setAttribute('y', yPos - CHIP_H / 2);
    chipBg.setAttribute('width', CHIP_W);
    chipBg.setAttribute('height', CHIP_H);
    chipBg.setAttribute('rx', CHIP_RX);
    chipBg.setAttribute('fill', '#000000');
    chipBg.setAttribute('stroke', '#000000');
    chipBg.setAttribute('stroke-width', '0.1');
    chipGroup.appendChild(chipBg);

    // Create chip text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', chipX + CHIP_W / 2);
    text.setAttribute('y', yPos + 0.3);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '1.95');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    text.setAttribute('font-weight', '600');
    text.textContent = skill.name;
    chipGroup.appendChild(text);
    
    svg.appendChild(chipGroup);

    // Store references for animation
    skill.branch = branch;
    skill.dot = dot;
    skill.chipGroup = chipGroup;
    skill.yPos = yPos;
  });

  // Handle scroll animation with enhanced intensity
  function updateTechTree() {
    const scrollTop = window.scrollY;
    const containerTop = container.offsetTop;
    const containerHeight = container.offsetHeight;
    const viewportHeight = window.innerHeight;
    
    // Calculate scroll progress within the container
    let scrollProgress = 0;
    const startOffset = viewportHeight * 0.2; // Start even earlier
    const scrollableHeight = containerHeight * 0.6; // Reduce scrollable area
    if (scrollTop > containerTop - startOffset) {
      scrollProgress = Math.min(1, (scrollTop - (containerTop - startOffset)) / scrollableHeight);
    }
    
    // Animate trunk with more pronounced effect
    trunk.style.strokeDasharray = trunkLength;
    trunk.style.strokeDashoffset = trunkLength * (1 - Math.pow(scrollProgress, 0.7));

    // Animate branches with adjusted timing
    skills.forEach((skill, index) => {
      const start = 0.02; // Start animation immediately
      const step = 0.05;  // Less spacing between items
      const speed = 4;    // Faster animation to complete earlier
      
      // Ease-in-out function for smoother animation
      const easeInOutCubic = t => t < 0.5 
        ? 4 * t * t * t 
        : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      
      // Calculate progress with easing
      let branchProgress = Math.max(0, (scrollProgress - (index * step + start)) * speed);
      branchProgress = Math.min(1, easeInOutCubic(branchProgress));
      
      // Animate branch with more pronounced effect
      if (skill.branch) {
        const branchLength = 35;
        skill.branch.style.strokeDasharray = branchLength;
        skill.branch.style.strokeDashoffset = branchLength * (1 - Math.pow(branchProgress, 1.5));
        skill.branch.style.strokeWidth = 0.3 + (branchProgress * 0.2); // Slight width increase
      }
      
      // Animate dot with bounce effect
      if (skill.dot) {
        const dotScale = branchProgress < 0.5 
          ? 1 + (branchProgress * 0.5) 
          : 1 + ((1 - branchProgress) * 0.5);
        skill.dot.style.opacity = Math.min(1, branchProgress * 2);
        skill.dot.style.transform = `scale(${dotScale})`;
      }
      
      // Animate chip group with more dynamic movement
      if (skill.chipGroup) {
        const chipProgress = Math.min(1, branchProgress * 2.5);
        skill.chipGroup.style.opacity = chipProgress;
        skill.chipGroup.style.transform = `translateY(${(1 - chipProgress) * 4}px) scale(${0.95 + (chipProgress * 0.1)})`;
        skill.chipGroup.style.transition = 'opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      }
    });
  }

  // Set up scroll event listener
  window.addEventListener('scroll', updateTechTree);
  updateTechTree(); // Initial update
});
