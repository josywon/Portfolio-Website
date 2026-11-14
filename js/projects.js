// Carousel entries. The first one is centred when the site opens.
//
//   glb        real CAD model (converted from STEP) in assets/models/
//   model      procedural part from models.js — used when there is no glb,
//              or as the fallback if the glb fails to load
//   tilt       resting pose of the part, [x, y, z] in radians
//   scale      size multiplier for a glb part (default 1)
//   modelNote  small text shown under the model on the project page
//   rows       the table under the title: [label, value] pairs;
//              a value can be a link: { label, href }, or { label, action: 'contact' }
//              to open the contact pop-up
//   overview   paragraphs; an array inside the list becomes a bulleted list
//   tools      chips under the overview (leave empty to hide the section);
//              or toolGroups: [[group name, [chips…]], …] for grouped chips
//   sections   extra résumé-style sections: [[title, [{ title, org, date, text }, …]], …]
//   links      buttons: { label, href }, or { label, action: 'contact' } to open the contact pop-up
//   gallery    { src, thumb, alt, caption } — click to enlarge; `caption` is the
//              description shown under the enlarged image. Add type: 'video'
//              for a video (src is the .mp4, thumb its cover frame).
//              Use null to hide the gallery section.

const github = (repo) => ({ label: repo, href: `https://github.com/${repo}` });

// Contact details shown in the pop-up (dock mail button and the About Me page).
// Email addresses are stored in two halves and only joined when the pop-up
// opens, so they never appear as plain text for scrapers to harvest.
export const contact = [
  { label: 'email', user: 'josephwon119', domain: 'gmail.com' },
  { label: 'school email', user: 'joseph.won', domain: 'uwaterloo.ca' },
  { label: 'linkedin', text: 'linkedin.com/in/josephwon119', href: 'https://www.linkedin.com/in/josephwon119/' },
  { label: 'github', text: 'github.com/josywon', href: 'https://github.com/josywon?tab=repositories' },
];

const about = {
  name: 'About Me',
  model: 'avatar',
  sway: true,              // rock side to side so the face always shows
  blurb: 'A mechanical engineering student passionate about aerospace and automotives :)',
  rows: [
    ['based in', 'Vancouver, Canada'],
    ['studying', 'BASc Mechanical Engineering, Honours Co-op — University of Waterloo (2026 – 2031)'],
    ['status', 'Open to opportunities'],
    ['contact', { label: 'View contact info', action: 'contact' }],
  ],
  overview: [],
  toolsTitle: 'skills',
  toolGroups: [
    ['CAD, simulation & design', ['AutoCAD', 'SolidWorks', 'Fusion 360', 'Ansys', 'GD&T']],
    ['Programming & embedded', ['Python', 'ESP32', 'Arduino IDE', 'Git', 'GitHub', 'KiCad']],
    ['Manufacturing', ['CNC Machining', '3D Printing', 'Laser Cutting', 'Metalworking', 'Woodworking']],
  ],
  sections: [
    ['awards', [
      {
        title: 'First Place, Brock Solutions Airport Innovation Challenge',
        org: 'Brock Solutions',
        date: 'Nov 2026',
        text: 'Designed a Bluetooth Low Energy bag tracker that uses trilateration, with a working ESP32 prototype.',
      },
      {
        title: 'Cadet Medal of Excellence',
        org: 'The Royal Canadian Legion',
        date: 'Jun 2026',
        text: 'Awarded to one cadet per year, recognized for a strong commitment to citizenship, leadership, and service.',
      },
      {
        title: 'Corps Commanding Officer’s Coin',
        org: '2381 (BCR) Irish Fusiliers Royal Canadian Army Cadet Corps',
        date: 'Jun 2026',
      },
    ]],
    ['leadership', [
      {
        title: 'Deputy Commander / Drill Sergeant Major',
        org: '2381 (BCR) Irish Fusiliers Royal Canadian Army Cadet Corps · Richmond, BC',
        date: 'Nov 2020 – Aug 2026',
        text: 'Led events for 100+ cadets and represented the corps on the Lower Mainland Senior Cadet Council.',
      },
      {
        title: 'Staff Cadet, Expedition',
        org: 'Vernon Cadet Training Centre, Department of National Defence · Vernon, BC',
        date: 'Jun 2025 – Aug 2025',
        text: 'Led a 30-cadet platoon through expedition training.',
      },
    ]],
  ],
  gallery: null,
};

const windTunnel = {
  name: 'Open Return Wind Tunnel',
  glb: 'assets/models/wind-tunnel.glb',
  model: 'flange',
  tilt: [0.32, 0.55, 0],
  scale: 1.45,             // long, thin part: draw it larger than the default fit
  blurb: 'Built an open-return tunnel to test car, aircraft, jet, and rocket models.',
  rows: [
    ['date', 'Sept 2026 – Nov 2026'],
    ['role', 'Mechanical Designer'],
    ['status', 'Complete'],
    ['github', github('josywon/Open-Return-Wind-Tunnel')],
  ],
  overview: [
    'Optimized tunnel geometry through extensive research and with CFD analysis in Ansys. Used Python and Autodesk Fusion to insert a graph as a spline for an optimized contraction cone shape. Sources for research are available to view in the GitHub repo :)',
    'Made a wind speed display using an ESP32 and Arduino IDE with an LCD screen that reads the variable power supply of the fans. Numbers were calculated using the provided volume displacement of the fan models, and the max velocity calculated using CFD.',
    'Built a variable-heat glycerine smoke machine with a nichrome circuit for visualizing airflow.',
  ],
  tools: ['Ansys CFD', 'Autodesk Fusion', 'Python', 'ESP32', 'Arduino IDE'],
  gallery: [
    { src: 'assets/wind-tunnel/tunnel.jpg', thumb: 'assets/wind-tunnel/tunnel-thumb.jpg', alt: 'The assembled wind tunnel on a bench',
      caption: 'The assembled tunnel: honeycomb inlet, contraction cone, lit test section and fan outlet.' },
    { src: 'assets/wind-tunnel/test.jpg', thumb: 'assets/wind-tunnel/test-thumb.jpg', alt: 'A model car in the lit test section',
      caption: 'A model car in the test section during a run.' },
    { src: 'assets/wind-tunnel/setup.jpg', thumb: 'assets/wind-tunnel/setup-thumb.jpg', alt: 'Setting up a test in the dark',
      caption: 'Setting up for a test.' },
    { type: 'video', src: 'assets/wind-tunnel/test-video.mp4', thumb: 'assets/wind-tunnel/test-video-thumb.jpg', alt: 'Wind tunnel test video',
      caption: 'Wind tunnel test video.' },
  ],
};

const modularTunnel = {
  name: 'Modular Cart Mounted Wind Tunnel',
  glb: 'assets/models/modular-tunnel.glb',
  model: 'flange',
  tilt: [0.5, 0.6, 0],
  scale: 1.3,
  blurb: 'Recruited to design and build a closed-return tunnel with multiple design teams and $8,000 in funding.',
  rows: [
    ['date', 'Oct 2026 – Present'],
    ['role', 'Mechanical Designer, Manufacturer'],
    ['status', 'Ongoing'],
    ['github', github('MatthewZ80/WindTunnelProject')],
  ],
  overview: [
    'Recirculating wind tunnels reduce noise and power requirements, and do not exhaust air, making it safer and usable in smaller spaces.',
    'This project is intended for use by:',
    [
      'The University of Waterloo IDEAs Clinic, for educational workshop topics providing early aerodynamic exposure to the student body.',
      'SDC student design teams such as WatArrow, WATurbine, Waterloo Formula Electric, and Waterloo Aerial Robotics Group, to include more iterative design verification, allowing better, more competitive designs to come out of the SDC and represent Waterloo on an international scale.',
      'Final Year Design Project groups, where capstone verification and validation options can be increased, increasing the quality of the final FYDP projects.',
    ],
  ],
  tools: ['Ansys FEA', 'CNC Machining'],
  gallery: [
    { src: 'assets/modular-tunnel/render.jpg', thumb: 'assets/modular-tunnel/render-thumb.jpg', alt: 'CAD render of the closed-return tunnel on its carts',
      caption: 'CAD render of the closed-return tunnel on its three carts.' },
  ],
};

const spaceMouse = {
  name: '6 Degree of Freedom Space Mouse',
  model: 'spacemouse',     // stand-in until the real assembly is converted
  blurb: 'Designing and building an industry-quality 3D space mouse for CAD.',
  rows: [
    ['date', 'Oct 2026 – Ongoing'],
    ['role', 'Electromechanical Design Lead'],
    ['status', 'Work in progress'],
    ['github', github('josywon/Space-Mouse')],
  ],
  overview: [
    'Prototyped and tested iterations with 3D printing, designed the model with GD&T in Autodesk Fusion.',
    'Designed a PCB with magnetic 6DoF sensors, an LED line, and four buttons. Custom PCB connects to an ESP32-S3.',
    'Wood CNCing the bottom base and resin printing the knob for a translucent and sleek look.',
  ],
  tools: ['Autodesk Fusion', 'GD&T', 'PCB design', 'ESP32-S3', '3D printing', 'CNC', 'Resin printing'],
  gallery: [
    { src: 'assets/space-mouse/pcb.jpg', thumb: 'assets/space-mouse/pcb-thumb.jpg', alt: 'PCB layout of the sensor board',
      caption: 'PCB layout for the sensor board.' },
  ],
};

const rocketry = {
  name: 'Waterloo Rocketry',
  model: 'rocket',
  logo: 'assets/rocketry/logo.png',      // drawn on the rocket's upper body
  modelNote: 'Generic liquid-propellant rocket shown for illustration — not a Waterloo Rocketry design.',
  blurb: 'Conducting diameter trade study research for Waterloo Rocketry’s first two-stage rocket.',
  rows: [
    ['date', 'Sept 2026 – Present'],
    ['role', 'Propulsion Designer, Manufacturer'],
    ['type', 'Student design team'],
  ],
  overview: [
    'Machined parts on a lathe and mill; assembled and integrated rocket hardware.',
    'Supported static-fire tests and tank assembly; followed chemical safety and sanitation rules.',
    'Made the best soft jaws the design team has ever seen :)',
  ],
  tools: [],
  gallery: [
    { src: 'assets/rocketry/mill.jpg', thumb: 'assets/rocketry/mill-thumb.jpg', alt: 'Drilling an aluminium block on a mill in the student machine shop',
      caption: 'Drilling an aluminium block on the mill in the Engineering Student Shop.' },
  ],
};

export const projects = [about, windTunnel, modularTunnel, spaceMouse, rocketry];
