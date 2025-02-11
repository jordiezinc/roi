document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded");
  
    const form = document.getElementById("email-form");
    const calculateButton = document.getElementById("calculate-btn");
  
    if (calculateButton) {
      calculateButton.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent form submission or page reload
        console.log("Calculate button clicked");
        const roiData = calculateROI();
        console.log("ROI Data:", roiData);
        displayResults(roiData);
        sendToGoogleSheet(roiData);
      });
    } else {
      console.error("Calculate button not found");
    }
  
    const numHiresSlider = document.getElementById("num-hires");
    const numHiresOutput = document.getElementById("num-hires-output");
  
    if (numHiresSlider && numHiresOutput) {
      numHiresSlider.addEventListener("input", function () {
        const numHires = parseInt(this.value) || 0;
        numHiresOutput.textContent = numHires;
        console.log("Slider value:", numHires);
      });
    } else {
      console.error("Slider or slider output element not found");
    }
  
    // When a checkbox is changed, show or hide its associated cost input container.
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        const containerId = `${event.target.id}-number-container`;
        const container = document.getElementById(containerId);
        if (container) {
          container.style.display = event.target.checked ? "block" : "none";
          console.log(
            `Checkbox ${event.target.id} is now ${
              event.target.checked ? "checked" : "unchecked"
            }`
          );
        } else {
          console.warn(`Container with ID ${containerId} not found`);
        }
      });
    });
  
    function getSelectedCheckboxes() {
      const selectedCheckboxes = [];
      let maxZincTime = 0;
      let maxAverageTime = 0;
      let totalCost = 0;
      const numHires = parseInt(document.getElementById("num-hires").value) || 0;
      const checkboxes = document.querySelectorAll(
        'input[type="checkbox"]:checked'
      );
  
      checkboxes.forEach((checkbox) => {
        // Try to obtain the cost input by using the ID pattern "checkboxID-number"
        const costInput = document.getElementById(`${checkbox.id}-number`);
        const cost = costInput ? parseInt(costInput.value) || 0 : 0;
        // Use default value 0 if the attributes are missing or empty.
        const zincTime = parseInt(checkbox.getAttribute("data-zinc-time")) || 0;
        const averageTime =
          parseInt(checkbox.getAttribute("data-average-time")) || 0;
  
        selectedCheckboxes.push({
          id: checkbox.id,
          zincTime: zincTime,
          averageTime: averageTime,
          cost: cost
        });
  
        if (zincTime > maxZincTime) {
          maxZincTime = zincTime;
        }
        if (averageTime > maxAverageTime) {
          maxAverageTime = averageTime;
        }
        totalCost += cost;
      });
  
      const formatTime = (time) => {
        if (time < 60) return `${time} minutes`;
        if (time < 1440) return `${Math.floor(time / 60)} hours`;
        return `${Math.floor(time / 1440)} days`;
      };
  
      return {
        selectedCheckboxes,
        zincTimePerCandidate: formatTime(maxZincTime),
        averageTimePerCandidate: formatTime(maxAverageTime),
        totalCost
      };
    }
  
    function calculateROI() {
      const numHires = parseInt(document.getElementById("num-hires").value) || 0;
      const salary = parseFloat(document.getElementById("salary").value) || 0;
      const adminTime =
        parseInt(document.getElementById("admin-time").value) || 0;
      const checkTimeDays =
        parseInt(document.getElementById("check-time-days").value) || 0;
  
      const {
        selectedCheckboxes,
        zincTimePerCandidate,
        averageTimePerCandidate,
        totalCost
      } = getSelectedCheckboxes();
  
      const hourlyRate = salary / 2080;
      const totalAdminTimeMinutes = adminTime * numHires;
      const lostHours = totalAdminTimeMinutes / 60;
      const lostDays = lostHours / 8;
      const adminCost = lostHours * hourlyRate;
  
      const roiData = {
        uuid: generateUUID(),
        checkTimeDays,
        numHires,
        salary,
        adminTime,
        currentDate: new Date().toISOString(),
        zincTimePerCandidate,
        averageTimePerCandidate,
        totalCostPerCandidate: totalCost,
        totalCostPerMonth: totalCost * numHires,
        lostDays: isNaN(lostDays) ? 0 : lostDays,
        adminCostPerMonth: isNaN(adminCost) ? 0 : adminCost,
        totalMonthlyCost: isNaN(totalCost * numHires + adminCost)
          ? 0
          : totalCost * numHires + adminCost
      };
  
      selectedCheckboxes.forEach((checkbox) => {
        roiData[checkbox.id] = "Yes";
        roiData[`${checkbox.id}-cost`] = checkbox.cost;
      });
  
      console.log("Calculated Values:", roiData);
      return roiData;
    }
  
    function displayResults(roiData) {
      const output = document.getElementById("output");
      if (output) {
        output.innerHTML = `
        <style>
          /* Two-column layout for the info sections */
          .info-sections {
            display: flex;
            justify-content: space-between;
            gap: 2rem;
            margin-bottom: 2rem;
          }
          .info-sections > div {
            flex: 1;
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          /* Styling for the CTA section */
          .output-cta-wrapper {
            text-align: center;
            margin-top: 2rem;
          }
          #emailContainer {
            margin-bottom: 1rem;
          }
          #emailContainer input {
            padding: 0.5rem;
            width: 60%;
            margin-right: 0.5rem;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          #buttonContainer button {
            margin: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          
          .highlight {
          ;color: #f04da9;
          }
         
        </style>
        <div class="info-sections">
          <div id="timeSavings">
            <h3>Time savings</h3>
            You make <strong class="highlight">${
              roiData.numHires
            }</strong> hires per month.<br><br>
            On average, it takes <strong class="highlight">${
              roiData.checkTimeDays
            } day${
          roiData.checkTimeDays === 1 ? "" : "s"
        }</strong> to complete the checks for each candidate.<br><br>
            Using Zinc, checks would take <strong class="highlight">${
              roiData.zincTimePerCandidate
            }</strong>*.<br>
            <p style="font-size:0.825rem; font-style:italic; margin-top:2rem;">*estimate based on our average turnaround times.</p>
          </div>
          <div id="costSavings">
            <h3>Cost of background checks</h3>
            Your checks cost: <strong class="highlight">£${formatOutput(
              roiData.totalCostPerCandidate
            )}</strong> per candidate which equates to <strong class="highlight">£${formatOutput(
          roiData.totalCostPerMonth
        )}</strong> per month.<br><br>
            For each hire, you spend <strong class="highlight">${
              roiData.adminTime
            } minutes</strong> on admin.<br><br>
            Resulting in a loss of <strong class="highlight">${formatOutput(
              roiData.lostDays
            )} working days</strong> monthly due to admin.<br><br>
            Based on the talent team’s salary, this costs <strong class="highlight">£${formatOutput(
              roiData.adminCostPerMonth
            )}</strong> per month.<br><br><br>
            Total cost of your checks per month, including the cost of admin time, amounts to <strong class="highlight">£${formatOutput(
              roiData.totalMonthlyCost
            )}</strong>.
          </div>
        </div>
        <div class="output-cta-wrapper">
          <p>To receive a copy of this report as a PDF please input your email address below.</p>
          <div id="emailContainer">
            <input class="form_field-input" type="email" id="userEmail" placeholder="Enter your email">
            <button class="A-0" id="sendEmailButton">Send PDF</button>
          </div>
          <div id="buttonContainer">
            <button class="button is-link  A-4 " id="recalculateButton" onclick="window.location.reload();">Recalculate</button>
            <button class="A-0" id="bookCallButton" onclick="window.location.href='https://zincwork.com/demo';">Book a Call</button>
          </div>
        </div>
      `;
        document
          .getElementById("sendEmailButton")
          .addEventListener("click", function () {
            const userEmail = document.getElementById("userEmail").value;
            if (userEmail) {
              sendEmailToGoogleSheet(roiData.uuid, userEmail);
            } else {
              alert("Please enter a valid email address.");
            }
          });
      } else {
        console.error("Output element not found");
      }
    }
  
    function formatOutput(value) {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    }
  
    function generateUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    }
  
    function sendToGoogleSheet(data) {
      const url =
        "https://script.google.com/macros/s/AKfycbwBqHQVJ-lMX8G5PdaMr3cFbuja267gBAj6colYLgU-PTUnm8aN2ODVkTeoMiUhPspt/exec"; // Replace with your Google Apps Script Web App URL
      fetch(url, {
        method: "POST",
        body: JSON.stringify(data)
      })
        .then((response) => response.json())
        .then((responseData) => {
          console.log("Data successfully sent to Google Sheet:", responseData);
        })
        .catch((error) => {
          console.error("Error sending data to Google Sheet:", error);
        });
    }
  
    function sendEmailToGoogleSheet(uuid, email) {
      const url =
        "https://script.google.com/macros/s/AKfycbwBqHQVJ-lMX8G5PdaMr3cFbuja267gBAj6colYLgU-PTUnm8aN2ODVkTeoMiUhPspt/exec"; // Replace with your Google Apps Script Web App URL
      fetch(url, {
        method: "POST",
        body: JSON.stringify({ updateEmail: true, uuid: uuid, email: email })
      })
        .then((response) => response.json())
        .then((responseData) => {
          console.log("Email successfully sent to Google Sheet:", responseData);
          alert("Your PDF will be sent to your email address.");
        })
        .catch((error) => {
          console.error("Error sending email to Google Sheet:", error);
        });
    }
  });
  