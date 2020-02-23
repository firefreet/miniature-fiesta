var inquirer = require('inquirer');
var mysql = require('mysql');
var consoleTable = require('console.table');
var questions = require('./assets/js/questions.js');
var password = require('./assets/js/password.js');
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
    switch (by) {
        // if passed a department filter parameter
        case "department": {
            // ask user which department to filter on
            bySelection = await getEntity("department", "Choose department to filter employees", true);
            // create string to add to query which will do filtering
            if (bySelection) {
                where = ` WHERE DeptName = ?`
                value = bySelection.deptname
            }
        }
            break;
        // if passed manager filter parameter
        case "manager": {
            // get user's choice of employees to list as the manager
            bySelection = await getEntity("employee", "Choose person to see who works for them...", true);
            // creat string to filter the query
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
    // display returned values if there are any, and a message if there are not
    data.length > 0 ? table(data) : displ(`There are no employees for that selection at this time`);
}

// displays table of Roles
async function viewRoles() {
    var data = await query(`SELECT role.id AS RoleID, role.title, 
            role.salary, department.id AS DeptID, department.deptname AS DeptName
            FROM role LEFT JOIN department ON role.department_id = department.id`);
    // display returned values if there are any, and a message if there are not
    data.length > 0 ? table(data) : displ(`There are no roles yet. Please add one first.`);
}

// displays table of Departments
async function viewDepts() {
    var data = await query(`SELECT * FROM department`);
    // display returned values if there are any, and a message if there are not
    data.length > 0 ? table(data) : displ("There are no departments yet. Please add one first");
}

// prompts user to choose from table records. whereID and caseEquals are optional to filter the query
async function getEntity(type, question, forceChoice, whereID, caseEquals) {
    // if caseEquals is passed as false, set filter query to exclude ids
    if (caseEquals === false) { var where = ` WHERE id <> ?` }
    // if caseEquals is true, set filter query to only get one id
    if (caseEquals === true) { var where = ' WHERE id = ?' }
    // query table for all records. 
    var records = await query(`SELECT * FROM ?? ${where}`, [type, whereID]);
    // transform returned list for prompt string display
    var choiceList = records.map(val => {
        switch (type) {
            case "role": return (`ID:${val.id}: Role > ${val.title}`);
            case "department": return (`ID:${val.id}: ${val.deptname}`);
            case "employee": return (`ID:${val.id}: ${val.last_name},${val.first_name}`);
        }
    });
    // if there are no items to view, return false
    if (choiceList.length === 0) { return false }
    // if parameter is false add a choice for the user to not make a selection from query result
    if (!forceChoice) choiceList.push("Not at this time...")
    // update inquirer question list of choices and message
    questions.getChoice[0].choices = choiceList;
    questions.getChoice[0].message = question;
    // prompt user with list
    var answer = await inquirer.prompt(questions.getChoice);
    // if the user chose to not make a selection from the query result, return null
    if (answer.choice === "Not at this time...") { return null }
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
// adds an employee to the data base
async function addEmployee() {
    // prompt user for first name, last name
    var answers = await inquirer.prompt(questions.addEmployeeQuestion);
    // prompt user for a role to add
    var role = await getEntity('role', 'Choose role to add');
    // prompt user for a manager to add
    var manager = await getEntity('employee', "Select employee's manager")
    // define values for the INSERT query, starting with role and manager fields as null
    var values = [
        answers.first_name,
        answers.last_name,
        null,
        null
    ]
    // if user chose to add a role or manager, update the values for the query
    if (role) values[2] = role.id
    if (manager) values[3] = manager.id
    // update table
    await query("INSERT INTO employee (first_name,last_name,role_id,manager_id) VALUES (?,?,?,?)", values);
    displ(`Added Employee: ${answers.first_name} ${answers.last_name}`);
};
// adds to the role table
async function addRole() {
    // get the role title and salary frome the user
    var answers = await inquirer.prompt(questions.addRoleQs)
    // allow to choose a deptment to associate
    var { id } = await getEntity('department', 'Choose Dept to add...');
    // sets values for query, with dept starting as null
    var values = [
        answers.titleName,
        answers.salary,
        null
    ]
    // if user selected a dept, add its id into the query values
    if (id) values[2] = id
    // update table
    await query("INSERT INTO role (title,salary,department_id) VALUES (?,?,?)", values);
    displ("Adding role: " + answers.titleName);
};

// add to the department table
async function addDepartment() {
    // get the new department name from the user
    await inquirer.prompt(questions.addDepartmentQuestion).then(async answers => {
        // update the table
        await query("INSERT INTO department (`deptname`) VALUES (?)", [answers.deptName])
        displ("Added " + answers.deptName);
    });
};
// allows user to remove a record from a table
async function removeEntity(type) {
    // prompt user with list of table records to remove
    var entity = await getEntity(type, `Choose ${entity} to remove...`);
    // if the table has no records, notify user
    if (entity === false) return displ(`There are no ${type}s to remove. Please add one first`)
    // if there were records, but user decided not to select one...
    if( entity === null) return displ(`Returning to menu...`)
    // otherwise, delete the selected record
    await query(`DELETE FROM ?? WHERE ?`, [type, { id: entity.id }]);
    displ(`Removed ${type} with ID ${entity.id}`);
};
// allows user to update various table records
// type is the table name, field is the column of the record to update
// isTable defines whether the field is an id referencing another table
// isString determines which type of prompt the user is given when the field is a table
async function updateEntity(type, field, isTable, isString) {
    // prompt user for record to update
    var entity = await getEntity(type, `Choose ${type} to update...`, true);
    // if there were no records to choose from, notify user
    if (!entity) { return displ(`There are no ${type}s to update. Please add one first.`) }
    // if the field to update is referencing another table...
    if (isTable) {
        // if trying to update the manager, redirect back to the employee table, and prevent selection of the same user
        if(field === "manager") {
           fieldTwo = "employee"
        var fieldValue = await getEntity(fieldTwo, `Choose ${field} to apply to ${type}...`, true, entity.id, false)
        }
        // otherwise just prompt with full list of table records 
        else {
            var fieldValue = await getEntity(field, `Choose ${field} to apply to ${type}...`, true)
        }
        // if there were no records to display, notify user
        if (!fieldValue) return displ(`There are no ${field}s to choose from.`)
        // update record based on users choices
        var resp = await query(`UPDATE ?? SET ?? = ? WHERE ID = ?`, [type, field + "_id", fieldValue.id, entity.id])
    } 
    // if the field to update is not referencing a table... 
    else {
        // switch out the options in the object for the inquirer prompt, based on it being a string or number
        fieldQ = questions.updateQ[0]
        if (!isString) {
            fieldQ.type = "number"
            fieldQ.validate = questions.numValidation
        } else {
            fieldQ.type = "input"
            fieldQ.validate = questions.stringLength
            fieldValue = "'" + fieldValue + "'"
        }
        // update the inquirer message
        fieldQ.message = `Please enter a new ${field} for the ${type}`
        // prompt user to input the text or number
        var { fieldValue } = await inquirer.prompt(fieldQ)
        // update the record
        var resp = await query(`UPDATE ?? SET ?? = ? WHERE ID = ?`, [type, field, fieldValue, entity.id])
    }
    displ(`Updated ${type} with new ${field}: `)
}

// allows user to update the department of the employee
// since depts are only related through roles
// after selecting the desired dept, user is given a list of roles in that dept
// and the actual update is to the role/employee relationship
async function updateEmployeeDept() {
    // prompt for employee to be updated
    var employee = await getEntity('employee', `Choose employee to update...`, true);
    if (!employee) { return displ(`There are no employees to update. Please add one first.`) }
    var empName = `${employee.last_name},${employee.first_name}`
    // prompt for department to apply
    var department = await getEntity('department', `Choose new department for ${empName}...`, true)
    if (!department) return displ(`There are no departments to choose from.`)
    // prompt for roles in that department
    var role = await getEntity('role', `Choose a role in the Dept: ${department.deptname} to apply to ${employee}`, true, department.id, true)
    if (!role) return displ('There are no roles in this department to choose from')
    // update table
    var resp = await query(`UPDATE employee SET role_id = ? WHERE id = ?`, [role.id, employee.id])
    displ(`Updated ${empName} to Dept: ${department.deptname} with role:${role.title} `)
}
// performs a sum query on the desired roles related to a selected department
async function deptSpend() {
    // prompt user for department
    var dept = await getEntity("department", 'Choose Department to display total spend')
    if (!dept) { return displ(`There are no Depts to review. Please add one first.`) }
    // query DB for the sum of salaries in that dept
    var spend = await query("SELECT SUM(role.salary) FROM role INNER JOIN department ON role.department_id = department.id WHERE department.id = ?", dept.id)
    displ(dept.deptname + " expenditure = " + spend[0]["SUM(role.salary)"])
}
// initial prompt questions for 'What do you want to do'
function startQs() {
    inquirer.prompt(questions.toDoQuestion)
        .then(async answers => {
            var moreQs = true
            switch (answers.toDo) {
                case "View all employees": await viewEmployees();
                    break;
                case "View all employees by department": await viewEmployees("department");
                    break;
                case "View all employees by manager": await viewEmployees("manager");
                    break;
                case "Add employee": await addEmployee();
                    break;
                case "Remove employee": await removeEntity(`employee`);
                    break;
                case "Update employee role": await updateEntity(`employee`, `role`, true);
                    break;
                case "Update employee manager": await updateEntity(`employee`, `manager`, true);
                    break;
                case 'Update employee department': await updateEmployeeDept();
                    break;
                case "View all roles": await viewRoles();
                    break;
                case "Add role": await addRole();
                    break;
                case "Remove role": await removeEntity(`role`);
                    break;
                case "Update role department": await updateEntity(`role`, `department`, true);
                    break;
                case "Update role salary": await updateEntity(`role`, `salary`, false, false);
                    break;
                case "View all departments": await viewDepts();
                    break;
                case 'Add department': await addDepartment();
                    break;
                case 'Remove department': await removeEntity('department');
                    break;
                case "Update department name": await updateEntity(`department`, `deptname`, false, true);
                    break;
                case "View department total employee salary": await deptSpend();
                    break;
                // if user chooses to stop, end the DB connection and set variable to stop asking new questions
                case "End": conn.end();
                default: moreQs = false
            }
            // keep reasking questions until set to false
            if (moreQs) { startQs() };
        });
};

// wrapper to await the connection to the database before asking questions
async function init() {
    await connect();
    console.log("connected as ID " + conn.threadId + "\n");
    startQs();

};
// start up app...
init();
