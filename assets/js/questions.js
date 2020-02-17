// validation for strings to ensure <= 30 characters, since DB is set up that way
function stringLength(answer){
    if(answer.length >30) return "Must be less than 30 Characters"
    return true
}

var toDoQuestion = [
    {
        type: 'list',
        message: 'What would you like to do?',
        name: 'toDo',
        choices: [
            // ADD Question before to break into Question sets
            // based on Employee, Role, Department

            "View all employees",
            'View all employees by department',
            // 'View all employees by manager',
            'Add employee',
            'Remove employee',
            'Update employee role',
            // 'Update employee manager',
            // 'Update employee department',
            'View all roles',
            'Add role',
            'Remove role',
            'Update role department',
            'Update role salary',
            'View all departments',
            'Add department',
            'Remove department',
            'Update department name',
            // 'View department total employee salary',
            'End'
        ]
    }
];

var updateQ = [
    {
        type: "input",
        message: "",
        name: "fieldValue"
    }
]

var addEmployeeQuestion = [
    {
        type: 'input',
        message: 'What is the employee\'s first name?',
        name: 'first_name',
        validate: stringLength
    },
    {
        type: 'input',
        message: "What is the employee's last name?",
        name: 'last_name',
        validate: stringLength
    }
]

var addDepartmentQuestion = [
    {
        type: 'input',
        message: 'What is the name of the Department',
        name: 'deptName',
        validate: stringLength
    }
]

var addRoleQs = [
    {
        type: 'input',
        message: 'What is the new title?',
        name: 'titleName',
        validate: stringLength
    },
    {
        type: 'number',
        message: 'What is the role\'s salary?',
        name: 'salary'
    }
]

var getChoice = [
    {
        type: 'list',
        message: '',
        name: 'choice',
        choices: []
    }
]

module.exports = {
    addEmployeeQuestion: addEmployeeQuestion,
    toDoQuestion: toDoQuestion,
    addDepartmentQuestion: addDepartmentQuestion,
    addRoleQs: addRoleQs,
    getChoice: getChoice,
    updateQ: updateQ,
    stringLength: stringLength
}