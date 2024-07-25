# simple-RBAC
Permit.io Project

I worked to make this repository able to fully build a permit.io environment without having to do any additional steps within the actual app (just running `node setupPermit.js`) would set everything up.  

## Structure

The main structure of the environment is as follows:

### Resources

The project is a "parent" of the task, report, and backend

Project (actions: create, view, comment, update, delete, assign)

Task (Task -> Project) (actions: create, view, comment, update, delete, assign)

Report (Report -> Project) (actions: view, generate, publish)

Backend (Backend -> Project) (actions: view, update, debug)


### Resource Instances

project:main_project

task:task1

task:task2

report:main_report

backend:backend_code


### Roles:

Admin

Project Manager

Team Member 

Client

Security


### Users:

Emily: (admin)

Alice: (project_manager)

Bob: (team_member)

Charlie: (client)

George: (security)



## Setup Steps

1. Create new directory

2. Create an empty Express.js project inside by writing these commands in the terminal:

`mkdir help-permissions && cd help-permissions && npm init -y && npm install express`

3. Install

`npm install permitio`

`npm install express`

4. Setting up a docker:

https://docs.permit.io/sdk/nodejs/quickstart-nodejs/?_gl=1*1hwtf0j*_gcl_au*MjAwNzY4NzQzMi4xNzE4NjM1Mzcx*_ga*MTMzNjc2MTA1Ny4xNzE4NjM1Mzcx*_ga_SPFKH5NXDE*MTcyMDc5ODIxOC4xMS4xLjE3MjA3OTk5NTQuMC4wLjA. 

Run in terminal (Replace <YOUR_API_KEY> with your actual API key):

`docker run -it -p 7766:7000 --env PDP_DEBUG=True --env PDP_API_KEY=<YOUR_API_KEY> permitio/pdp-v2:latest`

5. Run:

`node setupPermit.js`

6. Should output:

WORKING -- Emily/Admin should have access to everything

WORKING -- Emily/Admin should have access to everything

WORKING -- Alice/project manager should not be able to delete the main project

WORKING -- Alice/project manager should be able to generate the report

WORKING -- Bob/team member should not be able to view the backend

WORKING -- Bob/team member should not be able to publish the report

WORKING -- Charlie/client should be able to view the report

WORKING -- George/security should be able to debug the backend

WORKING -- George/security should be not able to view the report

WORKING -- George/security should be able to view the project


## Note:

Maybe this is a problem with my code or perhaps it is something wrong with permit.io but for some reason, sometimes the role derivations wouldn't work correctly (I think my cleanEnv function sometimes couldn't get rid of it) so to get all the tests to work, I would sometimes have to delete the entire container and run the setup from scratch again