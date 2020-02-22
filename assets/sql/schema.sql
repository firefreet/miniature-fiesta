
DROP DATABASE  IF EXISTS businessDB;
CREATE DATABASE businessDB;

USE businessDB;

CREATE TABLE IF NOT EXISTS employee (
  id INTEGER AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(30),
  last_name VARCHAR(30),
  role_id INTEGER,
  manager_id INTEGER
);

CREATE TABLE IF NOT EXISTS role (
    id INTEGER AUTO_INCREMENT,
    primary key (id),
    title VARCHAR(30),
    salary Decimal,
    department_id INTEGER
);


CREATE TABLE IF NOT EXISTS department (
  id INTEGER AUTO_INCREMENT PRIMARY KEY,
  deptname VARCHAR(30)
);