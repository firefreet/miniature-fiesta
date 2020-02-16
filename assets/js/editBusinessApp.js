var inquirer = require('inquirer');
var mysql = require('mysql');
var consoleTable = require('console.table');
var questions = require('./questions.js');
var password = require('./password.js');
var util = require('util');

// set up connection to mySQL database
var conn = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: password,
    database: 'businessDB'
});

// create promises out of the database connction and query functions
var connect = util.promisify(conn.connect).bind(conn);
var query = util.promisify(conn.query).bind(conn);

// wrap basic console log with newlines and indentation
function displ(content) {
    console.log("\n   >>>>>>   " + content + "\n")
}

// wrap table logging in newlines
function table(content) {
    console.log("\n");
    console.table(content);
    console.log("\n");
}

// displays table of employees
async function viewEmployees(by) {
    var where = ""
    // if passed a department filter parameter
    if (by === "department") {
        // ask user which department to filter on
        var dept = await getEntity("department");
        // create string to add to query which will do filtering
        where = ` WHERE department.name = "${dept.name}"`
    }
    // call query of employee database
    var data = await query(`SELECT employee.id AS empID, employee.first_name, 
        employee.last_name, employee.manager_id, role.title, role.salary, 
        department.name FROM employee LEFT JOIN role ON employee.role_id = role.id 
        LEFT JOIN department ON role.department_id = department.id ${where}`);
    // display returned values
    table(data);
}

// displays table of Roles
async function viewRoles() {
    var data = await query(`SELECT role.id AS RoleID, role.title, 
    role.salary, department.id AS DeptID, department.name 
    FROM role LEFT JOIN department ON role.department_id = department.id`);
    table(data);
}

// displays table of Departments
async function viewDepts() {
    var data = await query(`SELECT * FROM department`);
    table(data);
}

// prompts to choose from table
async function getEntity(type) {
    // query table for all records
    var records = await query(`SELECT * FROM ${type}`);
    // transform returned list for prompt string display
    var choiceList = records.map(value => {
        switch (type) {
            case "role": return (`ID:${value.id}: Role > ${value.title}`);
            case "department": return (`ID:${value.id}: ${value.name}`);
            case "employee": return (`ID:${value.id}: ${value.last_name}`);
        }
    });
    // update inquirer question list of choices and message
    questions.getChoice[0].choices = choiceList;
    questions.getChoice[0].message = `Which ${type}?`;
    // prompt user with list
    var answer = await inquirer.prompt(questions.getChoice);
    // get just the role ID from the answer to the prompt
    var entityID = answer.choice.split(":");
    entityID = entityID[1];
    // filter the inital employee list based on the chosen employee ID
    var choice = records.filter(val => {
        // id is an INT so first coerce it to a string for test
        return (val.id + "") === entityID;
    });
    // and return that to the caller
    return choice[0];
};

async function addEmployee() {
    var answers = await inquirer.prompt(questions.addEmployeeQuestion);
    var {id} = await getEntity('role');
    await query("INSERT INTO employee (first_name,last_name,role_id) VALUES (?,?,?)",
        [
            answers.first_name,
            answers.last_name,
            id
        ]);
    displ(`Added Employee: ${answers.first_name} ${answers.last_name}`);
};

async function addRole() {
    var answers = await inquirer.prompt(questions.addRoleQs)
    var { id } = await getEntity('department');
    await query("INSERT INTO role (title,salary,department_id) VALUES (?,?,?)",
        [
            answers.titleName,
            answers.salary,
            id
        ]
    );
    displ("Adding role: " + answers.titleName);
};

async function addDepartment() {
    await inquirer.prompt(questions.addDepartmentQuestion).then(async answers => {
        await query("INSERT INTO department (`name`) VALUES (?)", [answers.deptName])
        displ("Added " + answers.deptName);
    });
};

async function removeEntity(type) {
    var entity = await getEntity(type);
    await query(`DELETE FROM ${type} WHERE ?`, { id: entity.id });
    // await query(`DELETE FROM employee WHERE id = 12`);
    displ(`Removed ${type} with ID ${entity.id}`);
};


function startQs() {
    inquirer.prompt(questions.toDoQuestion)
        .then(async answers => {
            var moreQs = true
            switch (answers.toDo) {
                case "View all employees": await viewEmployees();
                    break;
                case "View all employees by department": await viewEmployees("department")
                    break;
                case "Add employee": await addEmployee();
                    break;
                case "Remove employee": await removeEntity(`employee`);
                    break;
                case "View all roles": await viewRoles();
                    break;
                case "Add role": await addRole();
                    break;
                case "Remove role": await removeEntity(`role`);
                    break;
                case "View all departments": await viewDepts();
                    break;
                case 'Add department': await addDepartment();
                    break;
                case 'Remove department': await removeEntity('department');
                    break;
                case "End": conn.end();
                default: moreQs = false
            }
            if (moreQs) { startQs() };
        });
};

async function init() {
    await connect();
    console.log("connected as ID " + conn.threadId + "\n");
    startQs();

};
init();

// don't forget to end the connection -- connect.end();

module.exports = {
    viewEmployees: viewEmployees,
    viewRoles: viewRoles,
    viewDepts: viewDepts,
    getEntity: getEntity,
    addEmployee: addEmployee,
    addRole: addRole,
    addDepartment: addDepartment,
    removeEntity: removeEntity,
    startQs: startQs,
    connect: connect,
    conn: conn
}