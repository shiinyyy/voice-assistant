// IP addresses data - copied from blacklistIP.json to avoid import issues
const ipAdressesData = ["192.168.0.1", "192.168.1.100", "10.0.0.5", "10.1.1.1", "172.16.0.10", "172.20.5.25"];

export const employeeAccountInfo = {
  employee1: {
    employeeID: "1190",
    name: "Shin Do",
    passCode: "01-10",
    position: "Product Manager",
    phone: "+61-478-740-088",
    email: "shin.do@gmail.com",
    status: "Not compromised",
    databaseAccess: "Yes",
    address: {
      street: "389 Pitt Street",
      city: "Sydney",
      state: "NSW",
      zip: "2000"
    },
    lastActivities: {
      networkTraffic: "Clean",
      emailPhising: "0",
      passwordUpdated: "2",
      twoFactorAuthentification: "Active",
      VPN: "Active",
      currentConnection: "Encrypted",
      notes: "Infrom user that all recent activity is clean, account is not penetrated"
    },
  },
  employee2: {
    employeeID: "1506",
    name: "Alex Karp",
    passCode: "05-05",
    position: "Associate Engineer",
    phone: "+61-431-550-103",
    email: "alex.karp@gmail.com",
    status: "compromised",
    databaseAccess: "No",
    address: {
      street: "123 George St",
      city: "Sydney",
      state: "NSW",
      zip: "2000"
    },
    lastActivities: {
      networkTraffic: "Mixed",
      emailPhising: "0",
      passwordUpdated: "0",
      twoFactorAuthentification: "Deactivate",
      VPN: "Active",
      currentConnection: "Unknown",
      notes: `Inform use that the account is at risk, It also have a mixed network tracffic. 
              Please activate two factor authentification to protect your account.`
    },
  }
};

export const dataBase = [
  {
    name: "Blacklist",
    topic: "black list checking",
    ipAdressessList: ipAdressesData,
    content:
      "This is the lastest updates from threat note.",
  },
  {
    name: "Access to Database",
    topic: "employee without access",
    content:
      ["Alex"],
  },
];

export const checkEmployeeAuthorisation = (employeeID: string): any => {
  console.log(`[checkEmployeeAuthorisation] Received employeeID: ${employeeID}`);
  const employees = Object.values(employeeAccountInfo);
  const employee = employees.find(emp => emp.employeeID === employeeID)

  if(employee) {
    if (employee.status === "Not compromised" && employee.lastActivities.currentConnection === "Encrypted") {
      const result = {
        Authorised: true, 
        message: "Employee is authorised.",
        employee: employee,
        databaseAccess: {
          granted: true,
          data: dataBase,
          allEmployees: employeeAccountInfo
        }
      };
      console.log(`[checkEmployeeAuthorisation] Authorised: ${JSON.stringify(result)}`);
      return result;
    } else {
      const result = {
        Authorised: false, 
        message: "Unauthorised.",
        employee: employee,
        reason: `Access denied: ${employee.status === "compromised" ? "Account is compromised" : "Connection is not encrypted"}`
      };
      console.log(`[checkEmployeeAuthorisation] Unauthorised: ${JSON.stringify(result)}`);
      return result;
      }
  } else {
    const result = {Authorised: false, message: "Employee ID not found."};
    console.log(`[checkEmployeeAuthorisation] Unauthorised: ${JSON.stringify(result)}`);
    return result;
  }
}; 