document.addEventListener("DOMContentLoaded", () => {
    // Animate the orbit dots
    animateOrbitDots()

    // Add hover effects to navigation
    const navItems = document.querySelectorAll(".nav-item")
    navItems.forEach((item) => {
        item.addEventListener("mouseenter", function () {
            this.style.transform = "translateY(-3px)"
        })

        item.addEventListener("mouseleave", function () {
            this.style.transform = "translateY(0)"
        })
    })

    // Add scroll reveal animation
    const sections = document.querySelectorAll("section")
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible")
                }
            })
        },
        { threshold: 0.1 },
    )

    sections.forEach((section) => {
        section.style.opacity = "0"
        section.style.transform = "translateY(20px)"
        section.style.transition = "opacity 0.6s ease, transform 0.6s ease"
        observer.observe(section)
    })

    // Add the visible class
    document.head.insertAdjacentHTML(
        "beforeend",
        `
        <style>
            section.visible {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        </style>
    `,
    )
})

function animateOrbitDots() {
    const googleDot = document.querySelector(".google-dot")
    const microsoftDot = document.querySelector(".microsoft-dot")
    const bytedanceDot = document.querySelector(".bytedance-dot")

    // Get the container dimensions
    const container = document.querySelector(".profile-container")
    const containerRect = container.getBoundingClientRect()

    // Calculate the center of the container
    const centerX = containerRect.width / 2
    const centerY = containerRect.height / 2

    // Set the same radius for all dots - slightly reduced to ensure visibility
    const radius = Math.min(containerRect.width, containerRect.height) * 0.6

    // Set different speeds for each dot
    const speed1 = 0.0015 // Google - slowest
    const speed2 = 0.0025 // Microsoft - medium
    const speed3 = 0.0035 // ByteDance - fastest

    // Set initial angles with equal spacing
    let angle1 = 0
    let angle2 = (2 * Math.PI) / 3 // 120 degrees offset
    let angle3 = (4 * Math.PI) / 3 // 240 degrees offset

    function updatePositions() {
        // Calculate new positions for each dot

        // Google dot
        const x1 = centerX + radius * Math.cos(angle1)
        const y1 = centerY + radius * Math.sin(angle1)
        googleDot.style.left = `${x1}px`
        googleDot.style.top = `${y1}px`
        googleDot.style.transform = "translate(-50%, -50%)"

        // Microsoft dot
        const x2 = centerX + radius * Math.cos(angle2)
        const y2 = centerY + radius * Math.sin(angle2)
        microsoftDot.style.left = `${x2}px`
        microsoftDot.style.top = `${y2}px`
        microsoftDot.style.transform = "translate(-50%, -50%)"

        // ByteDance dot
        const x3 = centerX + radius * Math.cos(angle3)
        const y3 = centerY + radius * Math.sin(angle3)
        bytedanceDot.style.left = `${x3}px`
        bytedanceDot.style.top = `${y3}px`
        bytedanceDot.style.transform = "translate(-50%, -50%)"

        // Update angles for next frame
        angle1 += speed1
        angle2 += speed2
        angle3 += speed3

        // Continue animation
        requestAnimationFrame(updatePositions)
    }

    // Start the animation
    updatePositions()

    // Update positions when window is resized
    window.addEventListener("resize", () => {
        const containerRect = container.getBoundingClientRect()
        const centerX = containerRect.width / 2
        const centerY = containerRect.height / 2
    })
}
