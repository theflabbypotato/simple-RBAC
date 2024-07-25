const { Permit, TenantsApi } = require("permitio"); // importing permit
const express = require("express");
const app = express();
const port = 4000; // port

/************ DOCKER CONTAINER **************/ 
/*
After installing docker, in terminal run:

docker run -it -p 7766:7000 --env PDP_DEBUG=True --env PDP_API_KEY=<YOUR_API_KEY> permitio/pdp-v2:latest

Replace <YOUR_API_KEY> with your api key from permit.io
*/

/************ PERMIT **************/ 
// creates permit session
const permit = new Permit({
    // in production, you might need to change this url to fit your deployment
    // try: 
    // http://localhost:7766 
    // or if that doesnt work for pdp
    // https://cloudpdp.api.permit.io

    pdp: 'http://localhost:7766',
    // your api key
    token: '<YOUR_API_KEY>',
});

// cleans the entire environment (so API doesn't throw errors saying duplicates exist)
const cleanEnv = async () => {
    // clean resources and relations
    const resources = await permit.api.resources.list();
    console.log(`Found ${resources.length} resources`);
    for (const resource of resources) {
        const resourceRelations = await permit.api.resourceRelations.list({
            resourceKey: resource.key,
        });
        console.log(`Found ${resourceRelations.length} resource relations`);
        for (const resourceRelation of resourceRelations.data) {
            console.log(`Deleting resource relation: ${resourceRelation.key}`);
            await permit.api.resourceRelations.delete(
                resource.key,
                resourceRelation.key,
            );
        }

        const resourceRoles = await permit.api.resourceRoles.list({
            resourceKey: resource.key,
        });
        console.log(`Found ${resourceRoles.length} resource roles`);
        for (const resourceRole of resourceRoles) {
            console.log(`Deleting resource role: ${resourceRole.key}`);
            await permit.api.resourceRoles.delete(
                resource.key,
                resourceRole.key,
            );
        }
        console.log(`Deleting resource: ${resource.key}`);
        await permit.api.resources.delete(resource.key);
    }

    // clean users
    const users = await permit.api.users.list();
    console.log(`Found ${users.length} users`);
    for (const user of users.data) {
        console.log(`Deleting user: ${user.key}`);
        await permit.api.users.delete(user.key);
    }

    // clean roles
    const roles = await permit.api.roles.list();
    console.log(`Found ${roles.length} roles`);
    for (const role of roles) {
        console.log(`Deleting role: ${role.key}`);
        await permit.api.roles.delete(role.key);
    }

    // Clean role derivations
    const resourcesWithDerivations = await permit.api.resources.list();
    console.log(`Found ${resourcesWithDerivations.length} resources with derivations`);
    for (const resource of resourcesWithDerivations) {
        const derivations = await permit.api.resourceRoles.list({ resourceKey: resource.key });
        for (const derivation of derivations) {
            console.log(`Clearing derivation: ${derivation.key} for resource: ${resource.key}`);
            await permit.api.resourceRoles.update(resource.key, derivation.key, {
                granted_to: { users_with_role: [] },
            });
        }
    }
};

// creates and syncs users
const createUsers = async () => {
   
    const allUsers = [
        {
            email: "emily@example.com",
            first_name: "emily",
        },
        {
            email: "alice@example.com",
            first_name: "alice",
        },
        {
            email: "bob@example.com",
            first_name: "bob",
        },
        {
            email: "charlie@example.com",
            first_name: "charlie",
        },
        {
            email: "george@example.com",
            first_name: "george",
        }
    ];
      
    await Promise.all(
        allUsers.map(({ email, first_name, }) =>
            permit.api.users.sync({
                email,
                key: email,
                first_name,
            }).then(()=>{
                console.log(`User created: ${email}`);
            })
        )
    );
};

// create resources (not actually connected to any macros, just demonstrating capabilites)
// also creates the roles in this step
const createResources = async () => {
    await permit.api.createResource({
        key: "project",
        name: "Project",
        actions: { create: {}, view: {}, comment: {}, update: {}, delete: {}, assign: {}},
        roles: {
            admin: {
                name: 'Admin',
                permissions: ['create', 'view', 'comment', 'update', 'delete', 'assign'],
            },
            project_manager: {
                name: 'Project Manager',
                permissions: ['create', 'view', 'comment', 'update', 'assign'],
            },
            team_member: {
                name: 'Team Member',
                permissions: ['view'],
            },
            security: {
                name: 'Security',
                permissions: ['view'],
            },
            client: {
                name: 'Client',
                permissions: ['view'],
            }

        }
    });

    await permit.api.createResource({
        key: "task",
        name: "Task",
        actions: { create: {}, view: {}, comment: {}, update: {}, delete: {}, assign: {}},
        roles: {
            admin: {
                name: 'Admin',
                permissions: ['create', 'view', 'comment', 'update', 'delete', 'assign'],
            },
            project_manager: {
                name: 'Project Manager',
                permissions: ['create', 'view', 'comment', 'update', 'assign'],
            },
            team_member: {
                name: 'Team Member',
                permissions: ['create', 'view', 'comment', 'update'],
            },
            security: {
                name: 'Security',
                permissions: ['view'],
            },
            client: {
                name: 'Client',
                permissions: ['view'],
            }
        }
    });

    await permit.api.createResource({
        key: "report",
        name: "Report",
        actions: { view: {}, generate: {}, publish: {}},
        roles: {
            admin: {
                name: 'Admin',
                permissions: ['view', 'generate', 'publish'],
            },
            project_manager: {
                name: 'Project Manager',
                permissions: ['view', 'generate'],
            },
            team_member: {
                name: 'Team Member',
                permissions: ['view'],
            },
            client: {
                name: 'Client',
                permissions: ['view'],
            }
        }
    });

    await permit.api.createResource({
        key: "backend",
        name: "Backend",
        actions: { view: {}, update: {}, debug: {}},
        roles: {
            admin: {
                name: 'Admin',
                permissions: ['view', 'update', 'debug'],
            },
            project_manager: {
                name: 'Project Manager',
                permissions: ['view', 'update', 'debug'],
            },
            security: {
                name: 'Security',
                permissions: ['view', 'update', 'debug'],
            },
        }
    });
};

// creates resources relations (Project is parent of the rest)
const createResourceRelations = async() => {
    console.log('Task -> Project');
    await permit.api.resourceRelations.create('task', {
        key: 'parent',
        name: 'Parent',
        subject_resource: 'project',
    });

    console.log('Report -> Project');
    await permit.api.resourceRelations.create('report', {
        key: 'parent',
        name: 'Parent',
        subject_resource: 'project',
    });

    console.log('Backend -> Project');
    await permit.api.resourceRelations.create('backend', {
        key: 'parent',
        name: 'Parent',
        subject_resource: 'project',
    });

};

// create resource instances (just one of each)
const createResourceInstances = async() => {
    console.log("Creating Resource Instances");
    await permit.api.resourceInstances.create({
        resource: "project",
        key: "main_project",
        tenant: "default",
    });

    await permit.api.resourceInstances.create({
        resource: "task",
        key: "task1",
        tenant: "default",
    });
    await permit.api.resourceInstances.create({
        resource: "task",
        key: "task2",
        tenant: "default",
    });

    await permit.api.resourceInstances.create({
        resource: "report",
        key: "main_report",
        tenant: "default",
    });

    await permit.api.resourceInstances.create({
        resource: "backend",
        key: "backend_code",
        tenant: "default",
    });

    // mapping tuples
    console.log("Mapping relationship tuples");

    permit.api.relationshipTuples.create({
        subject: "project:main_project",
        object: "task:task1",
        relation: "parent",
        tenant: "default",
    });

    permit.api.relationshipTuples.create({
        subject: "project:main_project",
        object: "task:task2",
        relation: "parent",
        tenant: "default",
    });

    permit.api.relationshipTuples.create({
        subject: "project:main_project",
        object: "report:main_report",
        relation: "parent",
        tenant: "default",
    });

    permit.api.relationshipTuples.create({
        subject: "project:main_project",
        object: "backend:backend_code",
        relation: "parent",
        tenant: "default",
    });
}

// assigning the roles
const assignRoles = async () => {
    console.log('Assigning Role: emily@example.com');
    await permit.api.roleAssignments.assign({
        role: 'admin',
        resource_instance: "project:main_project",
        tenant: 'default',
        user: 'emily@example.com',
    });

    console.log('Assigning Role: alice@example.com');
    await permit.api.roleAssignments.assign({
        role: 'project_manager',
        resource_instance: "project:main_project",
        tenant: 'default',
        user: 'alice@example.com',
    });

    console.log('Assigning Role: bob@example.com');
    await permit.api.roleAssignments.assign({
        role: 'team_member',
        resource_instance: "project:main_project",
        tenant: 'default',
        user: 'bob@example.com',
    });

    console.log('Assigning Role: charlie@example.com');
    await permit.api.roleAssignments.assign({
        role: 'client',
        resource_instance: "project:main_project",
        tenant: 'default',
        user: 'charlie@example.com',
    });

    console.log('Assigning Role: george@example.com');
    await permit.api.roleAssignments.assign({
        role: 'security',
        resource_instance: "project:main_project",
        tenant: 'default',
        user: 'george@example.com',
    });
    
};

// role derivations
const createRoleDerivations = async() => {
    console.log('Updating roles with conditions...');

    // Note: for some reason looping through doesnt seem to work so this appears to be the best way
    // just to do it all manually

    // admin
    console.log("Admin Role Derivations");
    await permit.api.resourceRoles.update('report', 'admin', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'admin',
                },
            ],
        },
    });

    await permit.api.resourceRoles.update('backend', 'admin', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'admin',
                },
            ],
        },
    });

    await permit.api.resourceRoles.update('task', 'admin', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'admin',
                },
            ],
        },
    });


    // project manager
    console.log("Project Manager Role Derivations");
    await permit.api.resourceRoles.update('report', 'project_manager', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'project_manager',
                },
            ],
        },
    });

    await permit.api.resourceRoles.update('backend', 'project_manager', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'project_manager',
                },
            ],
        },
    });

    await permit.api.resourceRoles.update('task', 'project_manager', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'project_manager',
                },
            ],
        },
    });

    
    // team member
    console.log("Team Member Derivations");
    await permit.api.resourceRoles.update('report', 'team_member', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'team_member',
                },
            ],
        },
    });

    
    await permit.api.resourceRoles.update('task', 'team_member', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'team_member',
                },
            ],
        },
    });

    // client
    console.log("Client Role Derivations");
    await permit.api.resourceRoles.update('report', 'client', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'client',
                },
            ],
        },
    });


    await permit.api.resourceRoles.update('task', 'client', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'client',
                },
            ],
        },
    });

    // security
    console.log("Security Role Derivations");
    await permit.api.resourceRoles.update('backend', 'security', {
        granted_to: {
            users_with_role: [
                {
                    linked_by_relation: 'parent',
                    on_resource: 'project',
                    role: 'security',
                },
            ],
        },
    });
    

};


// testing if permissions have been allocated correctly
const testingEnv = async() => {
    console.log("TESTING:\n");

    // emily
    const emilyTest1 = await permit.check(
        // user
        "emily@example.com",
        // action
        "debug",
        // resource
        {
            type: "backend",
            key: "backend_code",
        }
    );

    if (emilyTest1) {
        console.log("WORKING -- Emily/Admin should have access to everything");
    } else {
        console.log("NOT working -- Emily/Admin should have access to everything");
    }

    
    const emilyTest2 = await permit.check(
        // user
        "emily@example.com",
        // action
        "delete",
        // resource
        {
            type: "project",
            key: "main_project",
        }
    );

    if (emilyTest2) {
        console.log("WORKING -- Emily/Admin should have access to everything");
    } else {
        console.log("NOT working -- -- Emily/Admin should have access to everything");
    }

    
    // alice
    const aliceTest1 = await permit.check(
        // user
        "alice@example.com",
        // action
        "delete",
        // resource
        {
            type: "project",
            key: "main_project",
        }
    );

    if (!aliceTest1) {
        console.log("WORKING -- Alice/project manager should not be able to delete the main project");
    } else {
        console.log("NOT working -- Alice/project manager should not be able to delete the main project");
    }

    const aliceTest2 = await permit.check(
        // user
        "alice@example.com",
        // action
        "generate",
        // resource
        {
            type: "report",
            key: "main_report",
        }
    );

    if (aliceTest2) {
        console.log("WORKING -- Alice/project manager should be able to generate the report");
    } else {
        console.log("NOT working -- Alice/project manager should be able to generate the report");
    }

    // bob
    const bobTest1 = await permit.check(
        // user
        "bob@example.com",
        // action
        "view",
        // resource
        {
            type: "backend",
            key: "backend_code",
        }
    );

    if (!bobTest1) {
        console.log("WORKING -- Bob/team member should not be able to view the backend");
    } else {
        console.log("NOT working -- Bob/team member should not be able to view the backend");
    }

    const bobTest2 = await permit.check(
        // user
        "bob@example.com",
        // action
        "publish",
        // resource
        {
            type: "report",
            key: "main_report",
        }
    );

    if (!bobTest2) {
        console.log("WORKING -- Bob/team member should not be able to publish the report");
    } else {
        console.log("NOT working -- Bob/team member should not be able to publish the report");
    }

    const charlieTest2 = await permit.check(
        // user
        "charlie@example.com",
        // action
        "view",
        // resource
        {
            type: "report",
            key: "main_report",
        }
    );

    if (charlieTest2) {
        console.log("WORKING -- Charlie/client should be able to view the report");
    } else {
        console.log("NOT working -- Charlie/client should be able to view the report");
    }

    // george
    const georgeTest1 = await permit.check(
        // user
        "george@example.com",
        // action
        "debug",
        // resource
        {
            type: "backend",
            key: "backend_code",
        }
    );

    if (georgeTest1) {
        console.log("WORKING -- George/security should be able to debug the backend");
    } else {
        console.log("NOT working -- George/security should be able to debug the backend");
    }

    const georgeTest2 = await permit.check(
        // user
        "george@example.com",
        // action
        "view",
        // resource
        {
            type: "report",
            key: "main_report",
        }
    );

    if (!georgeTest2) {
        console.log("WORKING -- George/security should be not able to view the report");
    } else {
        console.log("NOT working -- George/security should be not able to view the report");
    }

    const georgeTest3 = await permit.check(
        // user
        "george@example.com",
        // action
        "view",
        // resource
        {
            type: "project",
            key: "main_project",
        }
    );

    if (georgeTest3) {
        console.log("WORKING -- George/security should be able to view the project");
    } else {
        console.log("NOT working -- George/security should be able to view the project");
    }
    

};



// setup then do the testing to see if the RBAC policy is working correctly
//setupPermit().then(() => testingEnv()).catch(console.error);

(async () => {
    await cleanEnv();

    await createUsers();
    await createResources();
    await createResourceRelations();
    await createResourceInstances();
    await assignRoles();
    await createRoleDerivations();

    // testing
    await testingEnv();

    console.log('Setup Done');
})();
