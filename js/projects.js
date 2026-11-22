// Carousel entries. The first one is centred when the site opens.
//
//   glb        real CAD model (converted from STEP) in assets/models/
//   model      procedural part from models.js — used when there is no glb,
//              or as the fallback if the glb fails to load
//   tilt       resting pose of the part, [x, y, z] in radians
//   scale      size multiplier for a glb part (default 1)
//   models     several selectable models: [{ label, glb | model, tilt, scale }, …]
//              (the minimal page shows a switch; the first one is the default)
//   modelNote  small text shown under the model on the project page
//   rows       the table under the title: [label, value] pairs;
//              a value can be a link: { label, href }, or { label, action: 'contact' }
//              to open the contact pop-up
//   overview   paragraphs; an array inside the list becomes a bulleted list
//   tools      chips under the overview (leave empty to hide the section);
//              or toolGroups: [[group name, [chips…]], …] for grouped chips
//   sections   extra résumé-style sections: [[title, [{ title, org, date, text, photos }, …]], …]
//              photos: same shape as gallery items, shown under that entry
//   links      buttons: { label, href }, or { label, action: 'contact' } to open the contact pop-up
//   gallery    { src, thumb, alt, caption } — click to enlarge; `caption` is the
//              description shown under the enlarged image. Add type: 'video'
//              for a video (src is the .mp4, thumb its cover frame).
//              Add fit: 'contain' for labelled diagrams that must not be cropped,
//              and a pdf path to offer the original document.
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
  blurb: 'A mechanical engineering student passionate about aerospace and automotives :) Also, click on the dot next to my name for a cool easter egg :)',
  portrait: { src: 'assets/wind-tunnel/setup.jpg', alt: 'Joseph setting up a wind tunnel test in the dark' },   // home page only: fills the space under the About text
  rows: [
    ['based in', 'Vancouver, Canada'],
    ['studying', 'BASc Mechanical Engineering, Honours Co-op — University of Waterloo (2026 – 2031)'],
    ['status', 'Open to opportunities'],
    ['contact', { label: 'View contact info', action: 'contact' }],
  ],
  overview: [],
  toolsTitle: 'skills',
  toolGroups: [
    ['CAD & simulation', ['SolidWorks', 'Fusion 360', 'AutoCAD', 'GD&T', 'Ansys FEA', 'Ansys CFD', 'OpenRocket']],
    ['Embedded systems & electronics', ['ESP32', 'Arduino', 'Arduino IDE', 'KiCad PCB design', 'Sensor integration', 'I2C']],
    ['Prototyping & fabrication', ['Hardware integration', 'CNC machining', '3D printing', 'Laser cutting', 'Metalworking', 'Woodworking']],
    ['Programming & tools', ['Python', 'Raspberry Pi', 'Git', 'GitHub', 'Microsoft Office', 'Google Workspace']],
  ],
  sections: [
    ['awards', [
      {
        title: 'First Place, Brock Solutions Airport Innovation Challenge',
        org: 'Brock Solutions',
        date: 'Nov 2026',
        text: 'Designed a Bluetooth Low Energy bag tracker that uses trilateration, with a working ESP32 prototype.',
        photos: [
          { src: 'assets/about/presenting.jpg', thumb: 'assets/about/presenting-thumb.jpg', alt: 'Presenting a prototype to judges at the innovation challenge',
            caption: 'Presenting at the Brock Solutions Airport Innovation Challenge.' },
        ],
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
        photos: [
          { src: 'assets/about/expedition.jpg', thumb: 'assets/about/expedition-thumb.jpg', alt: 'Expedition staff and cadets by a lake with a CTC Vernon canoe',
            caption: 'Expedition course staff and cadets, CTC Vernon.' },
          { src: 'assets/about/vernon-ctc.jpg', thumb: 'assets/about/vernon-ctc-thumb.jpg', alt: 'Cadets and staff of the Vernon Cadet Training Centre on the parade square',
            caption: 'Vernon Cadet Training Centre, summer 2025.' },
        ],
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
  blurb: 'An open-return tunnel for testing car, aircraft, jet and rocket models.',
  rows: [
    ['date', 'Sept 2026 – Nov 2026'],
    ['role', 'Mechanical Designer'],
    ['status', 'Complete'],
    ['github', github('josywon/Open-Return-Wind-Tunnel')],
  ],
  overview: [
    'Shaped the contraction cone from research and Ansys CFD, bringing the curve into Fusion as a spline with Python.',
    'Built an ESP32 wind-speed display that converts fan power to airspeed using the fan specs and CFD.',
    'Built a variable-heat glycerine smoke machine with a nichrome circuit to show airflow.',
  ],
  tools: ['Ansys CFD', 'Autodesk Fusion', 'Python', 'ESP32', 'Arduino IDE'],
  gallery: [
    { src: 'assets/wind-tunnel/smoke.jpg', thumb: 'assets/wind-tunnel/smoke-thumb.jpg', alt: 'Smoke flowing over a model car in the lit test section',
      caption: 'Smoke flowing over a model car in the test section.' },
    { type: 'video', src: 'assets/wind-tunnel/smoke-test.mp4', thumb: 'assets/wind-tunnel/smoke-test-thumb.jpg', alt: 'Smoke test over a model car',
      caption: 'Smoke test over a model car.' },
    { src: 'assets/wind-tunnel/tunnel.jpg', thumb: 'assets/wind-tunnel/tunnel-thumb.jpg', alt: 'The assembled wind tunnel on a bench',
      caption: 'The assembled tunnel: honeycomb inlet, contraction cone, lit test section and fan outlet.' },
    { src: 'assets/wind-tunnel/test.jpg', thumb: 'assets/wind-tunnel/test-thumb.jpg', alt: 'A model car in the lit test section',
      caption: 'A model car in the test section during a run.' },
    { src: 'assets/wind-tunnel/setup.jpg', thumb: 'assets/wind-tunnel/setup-thumb.jpg', alt: 'Setting up a test in the dark',
      caption: 'Setting up for a test.' },
    { src: 'assets/wind-tunnel/assembly.jpg', thumb: 'assets/wind-tunnel/assembly-thumb.jpg', alt: 'The assembled tunnel with its lit test section in the MME shop',
      caption: 'Assembling the tunnel in the MME shop.' },
    { type: 'video', src: 'assets/wind-tunnel/laser-cutting.mp4', thumb: 'assets/wind-tunnel/laser-cutting-thumb.jpg', alt: 'Laser cutting tunnel parts',
      caption: 'Laser cutting parts for the tunnel.' },
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
  blurb: 'A closed-return tunnel built with several design teams on $8,000 in funding.',
  rows: [
    ['date', 'Oct 2026 – Present'],
    ['role', 'Mechanical Designer, Manufacturer'],
    ['status', 'Ongoing'],
    ['github', github('MatthewZ80/WindTunnelProject')],
  ],
  overview: [
    'Recirculating: quieter and lower-power, with no exhaust, so it runs safely in small rooms.',
    'Splits into three carts that fit the E7 elevators; the diffusers bolt on for quick teardown.',
    'Built for IDEAs Clinic workshops, student design teams (WatArrow, WATurbine, Formula Electric, WARG) and capstone projects.',
  ],
  tools: ['Ansys FEA', 'CNC Machining'],
  gallery: [
    { src: 'assets/modular-tunnel/assembly.jpg', thumb: 'assets/modular-tunnel/assembly-thumb.jpg', alt: 'Labelled CAD assembly of the closed-return tunnel on its carts', fit: 'contain',
      caption: 'Blower fan and motor, 3D-printed adapter, honeycomb screens, and a polycarbonate main chamber with wood and metal reinforcement, on wood carts.' },
    { src: 'assets/modular-tunnel/sections.jpg', thumb: 'assets/modular-tunnel/sections-thumb.jpg', alt: 'The tunnel split into three carted sections and bolt-on diffusers', fit: 'contain',
      caption: 'Three carted sections that fit inside the E7 elevators; the diffusers bolt on for quick disassembly.' },
  ],
};

const spaceMouse = {
  name: '6 Degree of Freedom Space Mouse',
  model: 'spacemouse',     // stand-in until the real assembly is converted
  blurb: 'An industry-quality 3D mouse for CAD, designed and built from scratch.',
  rows: [
    ['date', 'Oct 2026 – Ongoing'],
    ['role', 'Electromechanical Design Lead'],
    ['status', 'Work in progress'],
    ['github', github('josywon/Space-Mouse')],
  ],
  overview: [
    'Designed in Fusion with GD&T; iterated through 3D-printed prototypes.',
    'Custom PCB: magnetic 6DoF sensors, LED strip, four buttons and an ESP32-S3.',
    'Final build: CNC-machined wood base and a translucent resin-printed knob.',
  ],
  tools: ['Autodesk Fusion', 'GD&T', 'PCB design', 'ESP32-S3', '3D printing', 'CNC', 'Resin printing'],
  gallery: [
    { src: 'assets/space-mouse/render.jpg', thumb: 'assets/space-mouse/render-thumb.jpg', alt: 'CAD render of the space mouse: knob on a translucent base',
      caption: 'CAD render of the full assembly.' },
    { src: 'assets/space-mouse/section.jpg', thumb: 'assets/space-mouse/section-thumb.jpg', alt: 'Section view through the space mouse',
      caption: 'Section view through the knob, shaft, sensor PCB and base.' },
    { src: 'assets/space-mouse/cad.jpg', thumb: 'assets/space-mouse/cad-thumb.jpg', alt: 'CAD assembly of the space mouse: knob, sensor PCB and base',
      caption: 'CAD assembly: knob, magnetic-sensor PCB and base.' },
    { src: 'assets/space-mouse/pcb-front.png', thumb: 'assets/space-mouse/pcb-front-thumb.png', fit: 'contain', alt: 'Rendered front of the sensor PCB',
      caption: 'Sensor PCB, front: three magnetic sensors, eight side LEDs and four buttons.' },
    { src: 'assets/space-mouse/pcb-back.png', thumb: 'assets/space-mouse/pcb-back-thumb.png', fit: 'contain', alt: 'Rendered back of the sensor PCB',
      caption: 'Sensor PCB, back: connector headers and the team’s names.' },
    { src: 'assets/space-mouse/pcb.jpg', thumb: 'assets/space-mouse/pcb-thumb.jpg', alt: 'PCB layout of the sensor board',
      caption: 'PCB layout for the sensor board.' },
  ],
};

const rocketry = {
  name: 'Waterloo Rocketry',
  model: 'rocket',
  logo: 'assets/rocketry/logo.png',      // drawn on the rocket's upper body
  modelNote: 'Generic liquid-propellant rocket shown for illustration — not a Waterloo Rocketry design.',
  blurb: 'Conducting a diameter trade study for Waterloo Rocketry’s first two-stage rocket using Python and OpenRocket.',
  rows: [
    ['date', 'Sept 2026 – Present'],
    ['role', 'Propulsion Designer, Manufacturer'],
    ['type', 'Student design team'],
  ],
  overview: [
    'Machine parts on the lathe and mill, including custom vise soft jaws; assemble and integrate rocket hardware.',
    'Support static fires and tank assembly under chemical-safety and sanitation rules.',
    'Made the best soft jaws the team has ever seen :)',
  ],
  tools: ['Python', 'OpenRocket', 'Lathe', 'Mill'],
  gallery: [
    { src: 'assets/rocketry/test-stand.jpg', thumb: 'assets/rocketry/test-stand-thumb.jpg', alt: 'Run tank and engine plumbed on the static-fire test stand',
      caption: 'Run tank and engine plumbed on the static-fire test stand.' },
    { src: 'assets/rocketry/static-fire-site.jpg', thumb: 'assets/rocketry/static-fire-site-thumb.jpg', alt: 'The team setting up at the static-fire test site',
      caption: 'Static-fire day: the team setting up at the test site.' },
    { src: 'assets/rocketry/mill.jpg', thumb: 'assets/rocketry/mill-thumb.jpg', alt: 'Drilling an aluminium block on a mill in the student machine shop',
      caption: 'Drilling an aluminium block on the mill in the Engineering Student Shop.' },
    { src: 'assets/rocketry/soft-jaws.jpg', thumb: 'assets/rocketry/soft-jaws-thumb.jpg', alt: 'Custom aluminium soft jaws mounted in a bench vise',
      caption: 'Custom aluminium soft jaws, designed and machined for vise workholding.' },
    { src: 'assets/rocketry/soft-jaw-drawing.jpg', thumb: 'assets/rocketry/soft-jaw-drawing-thumb.jpg', pdf: 'assets/rocketry/soft-jaw-drawing.pdf', fit: 'contain',
      alt: 'Engineering drawing of the soft jaw', caption: 'Soft jaw drawing: 6061 aluminium, machined on the mill.' },
  ],
};

export const projects = [about, windTunnel, modularTunnel, spaceMouse, rocketry];
