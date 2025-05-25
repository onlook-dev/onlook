<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a id="readme-top"></a>

![image](https://github.com/user-attachments/assets/7b787ac7-96cd-44fd-90da-46996e1e1bf5)

<div align="center">
<h3 align="center">Onlook</h3>

[![Discord][discord-shield]][discord-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
[![Twitter][twitter-shield]][twitter-url]

</div>

# Becoming web-first 🚧

If you're looking for the electron app, it's here:
https://github.com/onlook-dev/desktop

# The open-source vibecoding app

Open-source alternative to Bolt.new, Lovable, V0, Figma Make, etc. With our own
spin.

- [x] Create Next.js app in seconds
  - [x] Start from text or image
  - [ ] Use prebuilt templates
  - [ ] Import from Figma
  - [ ] Start from GitHub repo
- [x] Visually edit your app
  - [x] Use Figma-like UI
  - [x] Preview your app in real-time
  - [x] Manage brand assets and tokens
- [x] Development Tools
  - [x] Real-time code editor
  - [x] Save and restore from checkpoints
  - [x] Run commands via CLI
  - [x] Connect with app marketplace
- [ ] Deploy your app in seconds
  - [ ] Generate sharable links
  - [ ] Link your custom domain
- [ ] Collaborate with your team
  - [ ] Real-time editing
  - [ ] Leave comments

Also check the [open issues](https://github.com/onlook-dev/onlook/issues) for a
full list of proposed features (and known issues).

![Onlook-GitHub-Example](https://github.com/user-attachments/assets/642de37a-72cc-4056-8eb7-8eb42714cdc4)

### Built With

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Drizzle](https://orm.drizzle.team/)
- [TailwindCSS](https://tailwindcss.com/)
- [Bun](https://bun.sh/)
- [tRPC](https://trpc.io/)

## Documentation

For full documentation, visit [docs.onlook.com](https://docs.onlook.com)

To see how to Contribute, visit
[Getting Started](https://docs.onlook.com/docs/developer/contributing)

## Getting Started

Available soon with a [hosted app](https://onlook.com) or
[run locally](https://docs.onlook.com/docs/developer/running-locally).

### Usage

Onlook will run on any Next.js + TailwindCSS project, import your project
through V0, Figma, etc. into Onlook

<img width="676" alt="create new project" src="https://github.com/user-attachments/assets/ec5c9bb2-7d0a-4754-962e-5d0c9fe0d706">

Use the chat to create or edit a project you're working on. At any time, you can
always right-click an element to open up the exact location of the element in
code. Just be sure to choose your preferred IDE in the upper-right Corner of the
screen.

<img width="600" alt="image" src="https://github.com/user-attachments/assets/4ad9f411-b172-4430-81ef-650f4f314666" />

## How it works

<img width="676" alt="architecture" src="assets/architecture.png">

1. When you create an app, we load the code into a web container
2. The container runs and serves the code
3. Our editor receives the preview link and displays it in an iFrame
4. Our editor reads and indexes the code from the container
5. We instrument the code in order to map elements to their place in code
6. When the element is edited, we edit the element in our iFrame, then in code
7. Our AI chat also has code access and tools to understand and edit the code

This architecture can theoretically scale to any language or framework that
displays DOM elements declaratively (e.g. jsx/tsx/html). We are currently
focused on making it work well with Next.js and TailwindCSS.

For a full walkthrough, check out our
[Architecture Docs](https://docs.onlook.com/docs/developer/architecture)

## Contributing

![image](https://github.com/user-attachments/assets/ecc94303-df23-46ae-87dc-66b040396e0b)

If you have a suggestion that would make this better, please fork the repo and
create a pull request. You can also
[open issues](https://github.com/onlook-dev/onlook/issues).

See the [CONTRIBUTING.md](CONTRIBUTING.md) for instructions and code of conduct.

#### Contributors

<a href="https://github.com/onlook-dev/onlook/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=onlook-dev/onlook&t=1" />
</a>

## Contact

![image](https://github.com/user-attachments/assets/60684b68-1925-4550-8efd-51a1509fc953)

- Team: [Discord](https://discord.gg/hERDfFZCsH) -
  [Twitter](https://twitter.com/onlookdev) -
  [LinkedIn](https://www.linkedin.com/company/onlook-dev/) -
  [Email](mailto:contact@onlook.com)
- Project:
  [https://github.com/onlook-dev/onlook](https://github.com/onlook-dev/onlook)
- Website: [https://onlook.com](https://onlook.com)

## License

Distributed under the Apache 2.0 License. See [LICENSE.md](LICENSE.md) for more
information.

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
[weave-shield]: https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.workweave.ai%2Fapi%2Frepository%2Fbadge%2Forg_pWcXBHJo3Li2Te2Y4WkCPA33%2F820087727&cacheSeconds=3600&labelColor=#131313
[weave-url]: https://app.workweave.ai/reports/repository/org_pWcXBHJo3Li2Te2Y4WkCPA33/820087727
