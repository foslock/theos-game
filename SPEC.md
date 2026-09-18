# Summary of Theo's Game

I am looking to build a game inspiried by Zoombinis and Putt Putt/Freddie the Fish for my son to play when he is older and can use a computer. This game should run in the browser, and save state in local storage, but also allow for saving/loading a saved game state in case he wants to resume on another machine.

# Game Genre
Point and click, puzzle, adventure game. Much like the Humungous Entertainment games, the general point and click adventure format should be used, but also, each of the puzzles should have some built in variety/randomness that makes them interesting through each replay, and prevents the player from simply memorizing the solution.

# Game Engine

## Interface
This game will run in the browser as a point and click adventure game. All elements should be 90s pixel art, heavily in theme like Putt Putt and Freddie Fish. The game opens with an intro with an animated pixel art image of the house and a faded in game title (usign dithered fading) -- current working title is "Theo's Game" but that will likely change. The main menu should consist of "New Game", "Load Game", and "Settings". If there is a game in progress, "Resume Game" should also be an option (the first one listed). While in game, the main screen area is taken up mostly by the scene itself (background, characters, iteractable items, etc.) and below that should be the backpack inventory slots (if picked up). When the player hovers their cursor over an iteractable thing, the cursor should change to reflect the interaction. If it's a "next area" trigger zone, it should be an arrow pointing in that direction (grayed out if condition(s) are not yet satisfied). When scene transition animations are being played, all interactions should be disabled until the characters reach the next idle state.

## Game Graphics
We are using PixelLab.ai to generate static backgrounds and game sprites, in the style of the 90s kids games (like Zoombinis and Putt Putt). For each scene, we will need to have a prompt/config specific for PixelLab to generate what we need. Also, if you think generating Midjourney concept art first, and then using that to generate sprites in PixelLab is better we can do that.

## Inventory
Theo and Lucy share an inventory which is a simple backpack that Theo must pick up in his room before he starts his adventure. Once the backpack is interacted with, a 2x4 grid of boxes appear below the scene interface and the player will place items they pick up in the game in these eight squares. At no point should there be more than four items needed to be held (eg. there should be no "inventory management" required by the player). Interactable items that can be picked up for inventory or for missions should have some sort of glint animation appear on them if the use has been in the scene for over 60 seconds and hasn't clicked on them yet. Theo/Lucy can also provide a timed out loud comment if an item needs to be hinted at after this grace period.

The current interactable mission/quest items are listed here:

- Theo's Backpack (special, enables inventory and is not stored within itself), found in Theo's Bedroom
- Spoon, found in drawer in Kitchen
- Bowl, found in cabinet in Kitchen
- Cereal, found in cabinet in Kitchen
- Milk, found in fridge in Kitchen
- Basketballs (stored in the same grid item, up to 3 stacked) found hidden in Sport Court scene
- Stomp Rocket found in Theo's Bedroom
- Kitchen Door Key, found in Family Room
- Garage Door Key, found in Playhouse
- Playhouse Key, found in Playhouse mailbox
- Toy Bus, found in Family Room


## Scene Setup and Transitions
Each scene should consist of the following:
- A static (but animated) background that slowly cycles between animation frames (think leaves shifting in the wind, glinting on lights, small changes)
- Theo (and possibly Lucy) characters at some "rest" area in the scene where their idle animations play while the player is interacting with the scene.
- "Next area" trigger zones, where if the user clicks, Theo (and lucy is present) will animate towards (eg. walk/run) and when they enter the area, the scene fades and transitions to the target scene (where they were headed to).
- When transitioning into a scene, if they were coming from a previous one, they should be animated from the "next area" trigger zone that would send them back to that previous scene.
- Each scene is a node on a graph and if nodes are connected, it means the player can use the "next area" trigger zone to move to that next scene.
- Some connected scenes will require items or conditions to be met before the player can move between them (eg. an item is present in inventory, or a puzzle in the current scene has been solved, etc.)

## Scene Node Graph
Below are all of the scenes and a list of other connected scenes to it. This should be sufficient to build the scene graph. Conditions are also listed if the scene transitions are not open by default.

- Theo's Bedroom
	- Only open once Theo picks up backpack: Kitchen
	- Open to: Bathroom

- Bathroom
	- Open to: Theo's Bedroom

- Kitchen
	- Item required "Kitchen Door Key" for: Backyard
	- Open to: Family Room

- Family Room
	- Open to: Kitchen
	- Item required "Garage Key" for: Garage

- Garage
	- Open to: Family Room

- Backyard
	- Open to: Sport Court
	- Item required "Playhouse Key" for: Playhouse

- Sport Court
	- Open to: Backyard

- Playhouse
	- Open to: Playground
	- Open to: Backyard


# Game Story
This game follows a young boy named Theo and his sister Lucy through a fantastical journey around the property they live on. It starts in the morning waking up, and Theo has been tasked with playing with his sister until his parents get back home. The player can click and have Theo interact with various parts of the scenes, and just like the Humungous Entertainment games, many items are interactable (animated and make sound) without having any effect on the progression of the story. Each scene is intended to feel highly interactive.

## Breakfast
The first task that Theo has is to go downstairs where he finds his younger sister Lucy and get breakfast for the two of them. This should involve a search and find puzzle where a bowl, spoon, milk, and cereal need to be found in drawers, fridge, and cabinets.

## Sport Court
Next the kids need to make their way outside to play basketball on the sport court. First this should be a search and find game to find three hidden basketballs (they should be partially visible but hidden in the scene). Then, once they have found all three, they play a mini-game where they need to practice throwing the balls into three different height hoops.

## Backyard
Next, the kids need to go to the backyard and play with the sprinkler and stomp rocket. The stomp rockets are missing, but Theo should note to the player that he remembers them being in his room. This forces the player to backtrack through the scenes to get the rockets, which then they can use to play a minigame.

## Playground
