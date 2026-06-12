# Password generator by Donna Wilson 

# imports

import random
import string 

# Input for password length
passwd_length = int(input("Enter password length."))

#Storing password characters to a variable
pchars = string.ascii_letters
pchars += string.digits
pchars += string.punctuation

# for loop to generate password

password=""
for i in range (passwd_length):
    nextChar = random.choice(pchars)
    password += nextChar
    #printing password to user
print("Your password is: ",password)
