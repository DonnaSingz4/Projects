# TicTacToe Project by Donna Wilson

import tkinter
import random

def next_turn(row, column):
    global player
    if buttons[row][column]['text'] == "" and check_winner() is False:
        if player == players[0]:
            buttons[row][column]['text'] = player
            if check_winner() is False:
                player = players[1]
                label.config(text=players[1] + " turn")
            elif check_winner() is True:
                label.config(text=players[0] + " WINS!")
            elif check_winner() == "Tie":
                label.config(text="TIE")
        else:
            buttons[row][column]['text'] = player
            if check_winner() is False:
                player = players[0]
                label.config(text=players[0] + " turn")
            elif check_winner() is True:
                label.config(text=players[1] + " WINS!")
            elif check_winner() == "Tie":
                label.config(text="TIE")

def check_winner():
    # Check rows
    for row in range(3):
        if buttons[row][0]['text'] == buttons[row][1]['text'] == buttons[row][2]['text'] != "":
            return True

    # FIX 1 & 2: de-nested the loop and changed `row` → `column`
    # Check columns
    for column in range(3):
        if buttons[0][column]['text'] == buttons[1][column]['text'] == buttons[2][column]['text'] != "":
            return True

    # FIX 3: Added diagonal checks
    if buttons[0][0]['text'] == buttons[1][1]['text'] == buttons[2][2]['text'] != "":
        return True
    if buttons[0][2]['text'] == buttons[1][1]['text'] == buttons[2][0]['text'] != "":
        return True

    # FIX 3: Added tie and default return
    if empty_spaces() is False:
        return "Tie"

    return False

# FIX 4: Implemented empty_spaces
def empty_spaces():
    for row in range(3):
        for column in range(3):
            if buttons[row][column]['text'] == "":
                return True
    return False

# FIX 5: Implemented new_game
def new_game():
    global player
    player = random.choice(players)
    label.config(text=player + " turn")
    for row in range(3):
        for column in range(3):
            buttons[row][column].config(text="")

window = tkinter.Tk()
window.title("D's Tic-Tac-Toe")

players = ["x", "o"]
player = random.choice(players)

buttons = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
label = tkinter.Label(text=player + " turn", font=('Bookman Old Style', 40))
label.pack(side="top")

ResetButton = tkinter.Button(text="Restart", font=('Bookman Old Style', 20), command=new_game)
ResetButton.pack(side="top")

frame = tkinter.Frame(window)
frame.pack()

# FIX 6: Removed stray `olumn` text
# FIX 7: Added `command=lambda r=row, c=column: next_turn(r, c)` to wire up clicks
for row in range(3):
    for column in range(3):
        buttons[row][column] = tkinter.Button(
            frame, text="", font=("Bookman Old Style", 40), width=5, height=2,
            command=lambda r=row, c=column: next_turn(r, c)
        )
        buttons[row][column].grid(row=row, column=column)

window.mainloop()