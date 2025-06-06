const DISTRICT_API_URL = "https://api.npoint.io/18cba66dce43d200ae6f";
const stateSelect = document.getElementById("state-select");
const districtSelect = document.getElementById("district-select");
const queryInput = document.getElementById("query-input");
const searchButton = document.getElementById("search-button");
const errorMessage = document.getElementById("error-message");
const loadingSpinner = document.getElementById("loading-spinner");
const themeToggle = document.getElementById("theme-toggle");

const resultsDisplay = document.getElementById("results-display");

let allLocationData = {};

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector('svg');
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>';
  } else {
    icon.innerHTML = '<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>';
  }
}

themeToggle.addEventListener('click', toggleTheme);

async function fetchLocationData() {
  try {
    const response = await fetch(DISTRICT_API_URL);
    if (!response.ok) throw new Error("Failed to fetch location data.");
    allLocationData = await response.json();
    populateStates();
  } catch (error) {
    console.error("Error fetching location data:", error);
  } finally {
    showLoading(false);
  }
}

function populateStates() {
  const states = Object.keys(allLocationData).sort();
  states.forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });
}

stateSelect.addEventListener("change", () => {
  const selectedState = stateSelect.value;
  districtSelect.innerHTML = '<option value="">Select District</option>';
  if (selectedState && allLocationData[selectedState]) {
    allLocationData[selectedState].forEach(district => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
    districtSelect.disabled = false;
  } else {
    districtSelect.disabled = true;
  }
});


function showLoading(isLoading) {
  if (isLoading) {
    loadingSpinner.classList.add("loading");
    document.querySelector('.container').classList.add('loading-content');
  } else {
    loadingSpinner.classList.remove("loading");
    document.querySelector('.container').classList.remove('loading-content');
  }
}


searchButton.addEventListener("click", async () => {
  const query = queryInput.value.trim();
  const state = stateSelect.value;
  const district = districtSelect.value;

  if (!query) {
    showError("Please enter a query to search.");
    return;
  }

  clearError();
  showLoading(true);
  resultsDisplay.innerHTML = "";

  try {
    const locationContext = district
      ? `the ${district} district in ${state} state`
      : state
      ? `${state} state`
      : "India";

    const prompt = `
You are an expert AI assistant specializing in Indian government digital platforms, services, and schemes.
The user is looking for government platforms related to their query: "${query}".
The user is specifically interested in platforms relevant to ${locationContext}.
If a very specific local platform (district/city level) for the query exists and you know it, prioritize it. Otherwise, provide state-level or national platforms that are applicable.

Please identify and list relevant official Indian government platforms.
For each platform, provide:
1. "name": The official name of the platform or service.
2. "description": A concise description of its purpose and the key services it offers related to the query and location.
3. "url": The official URL of the platform. If an official URL is not readily available or you are unsure, you can omit it or provide an empty string.

Return the information as a JSON array of objects. Each object should have "name", "description", and "url" keys.
If no specific platforms are found for the given query and location, return an empty array. Do not return explanations outside the JSON structure.

User Query: "${query}"
Location Focus: ${locationContext}
`;
const response = await fetch("/api/get-platforms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "openai/gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  })
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Failed to fetch data from OpenRouter API: ${response.status} - ${errorText}`);
}

const data = await response.json();

if (!data.choices || !data.choices[0]?.message?.content) {
  console.error("Unexpected API response:", data);
  throw new Error("Unexpected API response format from backend.");
}

const content = data.choices[0].message.content.trim();


    let platforms = [];
    try {
      platforms = JSON.parse(content);
    } catch (parseError) {
      console.error("AI response parsing error:", parseError, content);
      throw new Error("Failed to parse AI response.");
    }

    if (platforms.length === 0) {
      resultsDisplay.innerHTML = "<p>No platforms found for the given query and location.</p>";
    } else {
      platforms.forEach(platform => {
        const platformDiv = document.createElement("div");
        platformDiv.classList.add("platform");

        const name = document.createElement("h3");
        name.textContent = platform.name;
        platformDiv.appendChild(name);

        const description = document.createElement("p");
        description.textContent = platform.description;
        platformDiv.appendChild(description);

        if (platform.url) {
          const link = document.createElement("a");
          link.href = platform.url;
          link.textContent = platform.url;
          link.target = "_blank";
          platformDiv.appendChild(link);
        }

        resultsDisplay.appendChild(platformDiv);
      });
    }
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
});

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add("visible");
  console.error("Error:", message);
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.remove("visible");
}

// Initialize
initTheme();
fetchLocationData();
