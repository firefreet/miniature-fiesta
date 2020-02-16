const editBusinessApp = require("../assets/js/editBusinessApp.js")
const inquirer = require("inquirer");
const mysql = require("mysql");
jest.mock("../assets/js/editBusinessApp.js");
jest.mock('inquirer');
jest.mock('mysql');

const mockOptions = {
    host: 'localhost',
    port: 3360,
    user: "root",
    password: "password"
}


const mockEmployee = [{
    first_name: "First Name",
    last_name: "Last Name",
    id: 1,
    manager_id: 1,
    role_id: 1
}]

const mockRole = [
    {
        id: 1,
        title: "Role Type",
        salary: 1,
        department_id
    }
]

const mockDept = [
    {
        id: 1,
        name: "Department Name"
    }
]

var choiceResp = {
    choice: "Some entity"
}

describe("Get Entitiy Function", () => {
    test("getEntity(employee) should return an employee object", () => {
        const mockQuery = jest
            .spyOn(editBusinessApp, 'query')
            .mockImplementation(() => { return mockEmployee })
        inquirer.prompt.mockResolvedValue(choiceResp)
        expect(editBusinessApp.getEntity('employee')).resolves.hasOwnProperty("name").toBe(true)
    })
});
