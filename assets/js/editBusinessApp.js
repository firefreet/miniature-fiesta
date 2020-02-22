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
    var bySelection
    var value = ""
    // if passed a department filter parameter
    switch (by) {
        case "department": {
            // ask user which department to filter on
            bySelection = await getEntity("department", "Choose department to filter employees");
            // create string to add to query which will do filtering
            if (bySelection) {
                where = ` WHERE DeptName = ?`
                value = bySelection.deptname
            }
        }
            break;
        case "manager": {
            bySelection = await getEntity("employee", "Choose person to see who works for them...");
            if (bySelection) {
                where = ` WHERE emp.manager_id = ?`
                value = bySelection.id
            }
        }
    }
    // call query of employee database
    var data = await query(`SELECT emp.id AS ID, emp.first_name AS FirstName, 
            emp.last_name AS LastName, role.title AS Title, role.salary AS Salary, 
            department.deptname AS DeptName, emp.manager_id AS MgrID, mgr.last_name AS MgrLastName
            FROM employee AS mgr RIGHT JOIN 
            employee emp ON mgr.id = emp.manager_ID LEFT JOIN role ON emp.role_id = role.id 
            LEFT JOIN department ON role.department_id = department.id ${where}`, value);
    // display returned values
    data.length > 0 ? table(data) : displ(`There are no employees for that selection at this time`);
}

// displays table of Roles
async function viewRoles() {
    var data = await query(`SELECT role.id AS RoleID, role.title, 
            role.salary, department.id AS DeptID, department.deptname AS DeptName
            FROM role LEFT JOIN department ON role.department_id = department.id`);
    data.length > 0 ? table(data) : displ(`There are no roles yet. Please add one first.`);
}

// displays table of Departments
async function viewDepts() {
    var data = await query(`SELECT * FROM department`);
    data.length > 0 ? table(data) : displ("There are no departments yet. Please add one first");
}

// prompts to choose from table
async function getEntity(type, question, selfID) {
    // 
    if (selfID) { var where = ` WHERE id <> ?` }
    // query table for all records
    var records = await query(`SELECT * FROM ?? ${where}`, [type, selfID]);
    // transform returned list for prompt string display
    var choiceList = records.map(val => {
        switch (type) {
            case "role": return (`ID:${val.id}: Role > ${val.title}`);
            case "department": return (`ID:${val.id}: ${val.deptname}`);
            case "employee": return (`ID:${val.id}: ${val.last_name},${val.first_name}`);
        }
    });
    if (choiceList.length === 0) { return false }
    choiceList.push("Do not update at this time")
    // update inquirer question list of choices and message
    questions.getChoice[0].choices = choiceList;
    questions.getChoice[0].message = question;
    // prompt user with list
    var answer = await inquirer.prompt(questions.getChoice);
    if(answer.choice ==="Do not update at this time"){return false}
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
    var role = await getEntity('role', 'Choose role to add');
    var manager = await getEntity('employee', "Select empployee's manager")
    await query("INSERT INTO employee (first_name,last_name,role_id,manager_id) VALUES (?,?,?,?)",
        [
            answers.first_name,
            answers.last_name,
            role.id,
            manager.id
        ]);
    displ(`Added Employee: ${answers.first_name} ${answers.last_name}`);
};

async function addRole() {
    var answers = await inquirer.prompt(questions.addRoleQs)
    var { id } = await getEntity('department', 'Choose Dept to add...');
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
        await query("INSERT INTO department (`deptname`) VALUES (?)", [answers.deptName])
        displ("Added " + answers.deptName);
    });
};

async function removeEntity(type) {
    var entity = await getEntity(type, `Choose ${entity} to remove...`);
    if (!entity) return displ(`There are no ${type}s to remove. Please add one first`)
    await query(`DELETE FROM ?? WHERE ?`, [type, { id: entity.id }]);
    displ(`Removed ${type} with ID ${entity.id}`);
};

async function updateEntity(type, field, isTable, isString) {
    var entity = await getEntity(type, `Choose ${type} to update...`);
    if (!entity) { return displ(`There are no ${type}s to update. Please add one first.`) }
    if (isTable) {
        field === "manager" ? fieldTwo = "employee" : fieldTwo = field
        var fieldValue = await getEntity(fieldTwo, `Choose ${field} to apply to ${type}...`, entity.id)
        if (!fieldValue) return displ(`There are no ${field}s to choose from.`)
        var resp = await query(`UPDATE ?? SET ?? = ? WHERE ID = ?`, [type, field + "_id", fieldValue.id, entity.id])
    } else {
        fieldQ = questions.updateQ[0]
        if (!isString) {
            fieldQ.type = "number"
            fieldQ.validate = questions.numValidation
        } else {
            fieldQ.type = "input"
            fieldQ.validate = questions.stringLength
            fieldValue = "'" + fieldValue + "'"
        }
        fieldQ.message = `Please enter a new ${field} for the ${type}`
        var { fieldValue } = await inquirer.prompt(fieldQ)
        var resp = await query(`UPDATE ?? SET ?? = ? WHERE ID = ?`, [type,field,fieldValue,entity.id])
    }
    displ(`Updated ${type} with new ${field}: `)
}

async function deptSpend() {
    var dept = await getEntity("department",'Choose Department to display total spend')
    if (!dept) { return displ(`There are no Depts to review. Please add one first.`) }
    var spend = await query("SELECT SUM(role.salary) FROM role INNER JOIN department ON role.department_id = department.id WHERE department.id = ?",dept.id)
    displ(dept.deptname + " expenditure = " + spend[0]["SUM(role.salary)"])
}

function startQs() {
    inquirer.prompt(questions.toDoQuestion)
        .then(async answers => {
            var moreQs = true
            switch (answers.toDo) {
                case "View all employees": await viewEmployees();
                    break;
                case "View all employees by department": await viewEmployees("department")
                    break;
                case "View all employees by manager": await viewEmployees("manager");
                    break;
                case "Add employee": await addEmployee();
                    break;
                case "Remove employee": await removeEntity(`employee`);
                    break;
                case "Update employee role": await updateEntity(`employee`, `role`, true)
                    break;
                case "Update employee manager": await updateEntity(`employee`, `manager`, true)
                    break;
                case "View all roles": await viewRoles();
                    break;
                case "Add role": await addRole();
                    break;
                case "Remove role": await removeEntity(`role`);
                    break;
                case "Update role department": await updateEntity(`role`, `department`, true)
                    break;
                case "Update role salary": await updateEntity(`role`, `salary`, false, false)
                    break;
                case "View all departments": await viewDepts();
                    break;
                case 'Add department': await addDepartment();
                    break;
                case 'Remove department': await removeEntity('department');
                    break;
                case "Update department name": await updateEntity(`department`, `deptname`, false, true)
                    break;
                case "View department total employee salary": await deptSpend();
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