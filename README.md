
<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

[<img alt="GitHub Thumbnail v2" src="https://github.com/user-attachments/assets/00a47677-ccfe-4f9c-8088-4d9b16104303">
](https://youtu.be/RSX_3EaO5eU)

<div align="center">
<h3 align="center">Onlook</h3>
  <p align="center">
    The first browser-powered visual editor.
    <br />
    <a href="https://github.com/onlook-dev/onlook/wiki"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://youtu.be/RSX_3EaO5eU?feature=shared">View Demo</a>
    ·
    <a href="https://github.com/onlook-dev/onlook/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/onlook-dev/onlook/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
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

</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

# The open-source, local-first visual editor for your React Apps

Seamlessly integrate with any website or webapp running on React + TailwindCSS, and make live edits directly in the browser DOM. Customize your design, control your codebase, and push changes your changes without compromise.

https://github.com/user-attachments/assets/c9bac609-5b05-417f-b2b2-e57d650d0dd6

![Export-1724891449817](https://github.com/user-attachments/assets/1f317ae1-6453-4a00-8801-f005ccc7efdb)

   
### Built With
* [![React][React.js]][React-url]
* [![Electron][Electron.js]][Electron-url]
* [![Tailwind][TailwindCSS]][Tailwind-url]
* [![Vite][Vite.js]][Vite-url]

## Stay up-to-date
Onlook officially launched our first version of Onlook on July 08, 2024 and we've shipped a ton since then. Watch releases of this repository to be notified of future updates, and you can follow along with us on [LinkedIn](https://www.linkedin.com/company/onlook-dev) or [Substack](https://onlook.substack.com/) where we write a weekly newsletter. 


<!-- ![Starproject](https://github.com/user-attachments/assets/07742b21-dd98-4be3-b6a6-13d8132af398) -->


## Getting Started

![image](https://github.com/user-attachments/assets/18b6ad5a-1d5a-4396-af8c-8b85936acf39)

### Installation

#### Run locally
1. Clone the repo
   ```sh
   git clone https://github.com/onlook-dev/onlook.git
   ```
2. Navigate to app folder inside the project
   ```sh
   cd onlook/app
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Run the project
   ```js
   npm run dev
   ```

#### Download from website

Visit [onlook.dev](https://onlook.dev/) to download the pre-built app.

### Usage

There are many ways to try out Onlook! Try one of the options below:

#### Option 1: Use your own React project

To try with your own React + TailwindCSS project, follow the following steps:

1. Run this command on your project's root folder:
```
npx onlook setup
```

2. Run your project
3. Open Onlook to where your project is running (i.e. `http://localhost:3000`).


See the [setup wiki](https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F) for more information.
#### Option 2: Start a new project

You can start from scratch using Onlook:

1. Run this command where you'd like to create the project folder
```
npx onlook create my-onlook-project
```
2. Run the project
```
cd my-onlook-project && npm run dev
```

3. Open Onlook at `http://localhost:3000`


See the the [CLI package](cli) for more information.

#### Option 3: Try a demo project

We have a few demo projects included in the [demos](demos) folder. These are standard React apps with Onlook configured.

To run, follow the following steps:

1. Run the demo project
   ```sh
   cd demos/next && npm install && npm run dev
   ```
2. Open Onlook at `http://localhost:3000`

## Roadmap

![image](https://github.com/user-attachments/assets/f64b51df-03be-44d1-ae35-82e6dc960d06)

See how we're tracking towards major [milestones]([url](https://github.com/onlook-dev/onlook/milestones)), and read the [wiki](https://github.com/onlook-dev/onlook/wiki/Roadmap) for details on each version of Onlook. Here's a rough overview of some of the major features we're looking at:

* [X] Browser
* [X] Editor
* [X] Write-to-code
* [ ] Components
* [ ] Variables

Also check the [open issues](https://github.com/onlook-dev/onlook/issues) for a full list of proposed features (and known issues).


## Contributing

![image](https://github.com/user-attachments/assets/ecc94303-df23-46ae-87dc-66b040396e0b)

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also [open issues](https://github.com/onlook-dev/onlook/issues).


See the [CONTRIBUTING.md](CONTRIBUTING.md) for instructions and code of conduct.

#### Contributors


<a href="https://github.com/onlook-dev/onlook/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=onlook-dev/onlook&t=0" />
</a>

## Contact

![image](https://github.com/user-attachments/assets/60684b68-1925-4550-8efd-51a1509fc953)

- Team: [Twitter](https://twitter.com/onlookdev) - [LinkedIn](https://www.linkedin.com/company/onlook-dev/) - [Email](mailto:contact@onlook.dev)
- Project: [https://github.com/onlook-dev/onlook](https://github.com/onlook-dev/onlook)
- Website: [https://onlook.dev](https://onlook.dev)

## Acknowledgments
Projects we're inspired by:
* [Visbug](https://github.com/GoogleChromeLabs/ProjectVisBug)
* [Responsively](https://github.com/responsively-org/responsively-app)
* [Supabase](https://github.com/supabase/supabase)
* [ShadCN](https://github.com/shadcn-ui/ui)

## License

Distributed under the Apache 2.0 License. See [LICENSE.md](LICENSE.md) for more information.


<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/onlook-dev/studio.svg?style=for-the-badge
[contributors-url]: https://github.com/onlook-dev/onlook/graphs/contributors

[forks-shield]: https://img.shields.io/github/forks/onlook-dev/studio.svg?style=for-the-badge
[forks-url]: https://github.com/onlook-dev/onlook/network/members

[stars-shield]: https://img.shields.io/github/stars/onlook-dev/studio.svg?style=for-the-badge
[stars-url]: https://github.com/onlook-dev/onlook/stargazers

[issues-shield]: https://img.shields.io/github/issues/onlook-dev/studio.svg?style=for-the-badge
[issues-url]: https://github.com/onlook-dev/onlook/issues

[license-shield]: https://img.shields.io/github/license/onlook-dev/studio.svg?style=for-the-badge
[license-url]: https://github.com/onlook-dev/onlook/blob/master/LICENSE.txt

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

[product-screenshot]: assets/brand.png

