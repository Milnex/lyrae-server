Project Lyrae
=============
API Server powered by Node.js   


## Dependencies ##

    apt-get install node mongodb

## Installation ##

    cd lyrae-server
    npm install

## Execution ##

    node app.js

## GET /users ##
**List all users**   

## GET /user/:uid ##
**Get an user data given :id**   

## POST /user ##
**Create an user given :uid & :name**   

    uid=<fbid>   
    name=<user name>   
    
## POST /user/:uid ##
**Modify an user attribute given :uid**   

    longitude=<longitude>   
    latitude=<latitude>   
    activity=<activity>   
    matching=<if request a matching: boolean>   
    
## GET /match/:uid ##
**Match an user given :uid by its activity**   

    return a newly created group id :gid if matching any other users

## GET /group/:gid ##
**Query for a group given :gid**   

    return a list of users in that group


