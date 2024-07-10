
<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>


<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
<!-- [![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Apache License][license-shield]][license-url] -->


[![Discord][discord-shield]][discord-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
[![Twitter][twitter-shield]][twitter-url]



[![Onlook Screen Shot][product-screenshot]](https://youtu.be/RSX_3EaO5eU)

<div align="center">
<h3 align="center">Onlook</h3>
  <p align="center">
    The first browser-powered visual editor.
    <br />
    <a href="https://github.com/onlook-dev/studio/wiki"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://youtu.be/RSX_3EaO5eU?feature=shared">View Demo</a>
    ·
    <a href="https://github.com/onlook-dev/studio/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/onlook-dev/studio/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li> <a href="#about">About</a> </li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

## About

Build your UI visually. Supports any React + TailwindCSS app.

https://github.com/onlook-dev/studio/assets/31864905/ea429342-03bc-40b2-8a94-d3955f638015


### Built With
* [![React][React.js]][React-url]
* [![Electron][Electron.js]][Electron-url]
* [![Tailwind][TailwindCSS]][Tailwind-url]
* [![Vite][Vite.js]][Vite-url]


### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/onlook-dev/studio.git
   ```
2. Navigate to app folder inside the project
   ```sh
   cd studio/app
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Run the project
   ```js
   npm run dev
   ```


## Usage

### Trying with demo project

We have a few demo projects included in the `demos` folder. These inside are a standard React app and a Next.js React app. 

These are already set up with the Onlook plugins and have code written to them directly.

To run, follow the following steps:

1. Run the demo project
   ```sh
   cd demos/next && npm install && npm run dev
   ```
2. Open Onlook studio
3. Point to `http://localhost:3000`

For more examples, please refer to the [Documentation](https://docs.onlook.dev)

### Using your own React project

To try with your own React + TailwindCSS project, follow the following steps:

1. Install the corresponding Onlook plugins for your React framework:
     1. [Nextjs](https://www.npmjs.com/package/@onlook/nextjs)
     2. [Babel (webpack, esbuild, vite, etc.)](https://www.npmjs.com/package/@onlook/babel-plugin-react)
2. Run your project in dev mode
3. Open Onlook studio to where your project is running locally. For example `http://localhost:3000`

The code for the plugins are under `plugins`.

## Roadmap

* [X] Browser
* [X] Editor
* [X] Write-to-code
* [ ] Components
* [ ] Variables
* [ ] Code Editor

See the [roadmap](readme/ROADMAP.md) for a detailed list of project goals and improvements.

See the [open issues](https://github.com/onlook-dev/studio/issues) for a full list of proposed features (and known issues).


## Contributing

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also [open issues](https://github.com/onlook-dev/studio/issues).


See the [CONTRIBUTING.md](readme/CONTRIBUTING.md) for instructions and code of conduct.

## Contact

- Onlook Team - [@onlookdev](https://twitter.com/onlookdev) - contact@onlook.com
- Project Link: [https://github.com/onlook-dev/studio](https://github.com/onlook-dev/studio)
- Website: [https://onlook.dev](https://onlook.dev)

## Acknowledgments

* [Project Visbug](https://github.com/GoogleChromeLabs/ProjectVisBug)
* [Responsively App](https://github.com/responsively-org/responsively-app)

## License

Distributed under the Apache 2.0 License. See [LICENSE.md](LICENSE.md) for more information.


<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/onlook-dev/studio.svg?style=for-the-badge
[contributors-url]: https://github.com/onlook-dev/studio/graphs/contributors

[forks-shield]: https://img.shields.io/github/forks/onlook-dev/studio.svg?style=for-the-badge
[forks-url]: https://github.com/onlook-dev/studio/network/members

[stars-shield]: https://img.shields.io/github/stars/onlook-dev/studio.svg?style=for-the-badge
[stars-url]: https://github.com/onlook-dev/studio/stargazers

[issues-shield]: https://img.shields.io/github/issues/onlook-dev/studio.svg?style=for-the-badge
[issues-url]: https://github.com/onlook-dev/studio/issues

[license-shield]: https://img.shields.io/github/license/onlook-dev/studio.svg?style=for-the-badge
[license-url]: https://github.com/onlook-dev/studio/blob/master/LICENSE.txt

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/company/onlook-dev

[twitter-shield]: https://img.shields.io/badge/-Twitter-black?logo=x&colorB=555
[twitter-url]: https://x.com/onlookdev

[discord-shield]: https://img.shields.io/badge/-Discord-black?logo=discord&colorB=555
[discord-url]: https://discord.gg/hERDfFZCsH

[React.js]: https://img.shields.io/badge/react-%2320232a.svg?logo=react&logoColor=%2361DAFB
[React-url]: https://reactjs.org/

[TailwindCSS]: https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?logo=tailwind-css&logoColor=white
[Tailwind-url]: https://tailwindcss.com/

[Electron.js]: https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white
[Electron-url]: https://www.electronjs.org/

[Vite.js]: https://img.shields.io/badge/vite-%23646CFF.svg?logo=vite&logoColor=white
[Vite-url]: https://vitejs.dev/

[product-screenshot]: readme/assets/brand.png

