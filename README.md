Bradley Player Tracking
  Written by: Holten Bradley


----------------- How to -----------------

**Install node.js**

https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
Make sure to pay attention to the questions on the installer. You will need to download EVERYTHING necessary to run node.js
If this link does not work, ask chatgpt for help! 

run this command to check for this or a newer version
$ node -v
v24.14.1


**Clone this repo**

In File Explorer, Go to your desired location for downloading this repository. Right click and select open in terminal (git bash here, windows powershell here, etc.)
  Copy and paste this next line into your terminal
git clone https://github.com/holten-bradley/Bradley_Player_Tracking.git

Make sure to navigate to the project directory with the cd command. (ask chatgpt for help!)

$ cd Bradley_Player_Tracking/


**RUN THE APP**

$ npm install
$ npm run dev

> bradley-player-analysis@0.0.0 dev
> vite


  VITE v5.4.21  ready in 221 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help



Hold CTRL and click on the localhost link. The Player Tracking app should be running in your default browser!





----------------- Editor's Notes -----------------


This app came from the belief that there are missed stats within the game of basketball. 
The best way to get those stats is to track players down to the movement. 
There is a movement and a result in every action on the court. 
A dribble can lead to a pass, shot, or turnover. A pass can be complete or incomplete. A shot can be for 3, 2 or 1 point. (also made or missed)

These actions are nearly impossible to track with 10 players on the court, but not impossible for 5 players. 
With proper training, I believe this concept can unlock a new statistic for analysing basketball players.

Create a game.
Throw at least 5 players on the court. (One for each position)
Start tracking movements by clicking on players, holding down, dragging to an action, and releasing to confirm said action. The live tracking is the best result to debut this product.
Play around with the actions and different menus. Any feedback is welcome!


Note: error checking is minimal in this app. It is not a production app, but a showcase of what could be. This app is in beta.
  Email: holten_bradley@yahoo.com with any comments, questions or additions :)
