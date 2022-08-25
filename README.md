# bad-vrc-osc
💬 Small Spotify integration into VRChat's chatbox OSC. Works on Linux and Windows!

- [bad-vrc-osc](#bad-vrc-osc)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
    - [Using Docker (Recommended)](#using-docker-recommended)
    - [Using Yarn](#using-yarn)
  - [Setup](#setup)
  - [Update](#update)
  - [Screenshots](#screenshots)

## Prerequisites
To allow the application to interface with Spotify, you'll need to create a OAuth application in [Spotify's developer portal](https://developer.spotify.com/dashboard/applications). 
In order to do this, I've created a step-by-step tutorial below.

1. Open [the Spotify developer portal](https://developer.spotify.com/dashboard/applications) in any browser of your choice.
2. Press 'CREATE AN APP' and give it a name and description. This shouldn't matter but make sure you can identify it in case it ever breaks. ![Create](https://i.imgur.com/QZRoDqH.png)
3. Once you've created an app, click on it to go to its overview. On this page you'll need to get the two parameters called 'Client ID' and 'Client Secret'. **Never share the Client Secret with anyone besides yourself.** ![Client](https://i.imgur.com/t9aKZmy.png)
4. Go to 'Edit Settings', scroll down to 'Redirect URIs' and add `http://localhost:8888/callback`. Press save at the bottom and you're good to go. ![Callback Tab](https://i.imgur.com/wHd2eGY.png)

## Installation
For both methods you'll need to have [Git](https://git-scm.com/), a version control system, installed.

### Using Docker (Recommended)
You'll need to have [Docker](https://www.docker.com/) installed on your machine, alongside with [Docker Compose](https://docs.docker.com/compose/) (usually included in the Docker install) version 3 or above.

1. Clone the project using `git clone https://github.com/bddvlpr/bad-vrc-osc.git` to a directory on your local machine.
2. Enter the directory you've just cloned using `cd bad-vrc-osc`.
3. Copy `.env.example` to `.env` and fill in the 'Client ID' and 'Client Secret' you obtained above.
4. Simply write `docker compose up` and the project will start building itself. After building, the app should automatically start.

### Using Yarn
You'll need to have [Node JS](https://nodejs.org/en/) version 16 or above and a functioning [Yarn](https://yarnpkg.com/) install.

1. Clone the project using `git clone https://github.com/bddvlpr/bad-vrc-osc.git` to a directory on your local machine.
2. Enter the directory you've just cloned using `cd bad-vrc-osc`.
3. Copy `.env.example` to `.env` and fill in the 'Client ID' and 'Client Secret' you obtained above.
4. Install the dependencies using `yarn install`.
5. Run the application using `yarn dev` (or build using `yarn build`).

## Setup
Once you've got the app running, navigate to [localhost:8888/callback](http://localhost:8888/callback) and log in using the account you'll be using for your status.
After this, it should save your access token and refresh token in `data/` and will (probably) never ask you to log in again.

That's it! Make sure you have OSC enabled and have chatboxes shown.

## Update
If you want to update the project, simply make sure you're navigated into the right directory (`cd bad-vrc-osc`) and enter `git pull`.

## Screenshots

![Example](https://i.imgur.com/ha3hOOD.png)