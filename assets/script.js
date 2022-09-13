//! CHECK TO SEE IF API KEY IS VERIFIED YET, RUN TESTS ON TESTSCRIPT.JS IF IT IS

const apiKey = "a17e1499228be1f9c294ac18b234c7d7"

// Elements from HTML to be dynamically altered
var cityEl = $('#city');
var dateEl = $('#date');
var weatherIconEl = $('#weather-icon');
var temperatureEl = $('#temperature');
var humidityEl = $('#humidity');
var windEl = $('#wind');
var cityListEl = $('.cityList');
var uvIndexEl = $('#uv-index')
var cityInput = $('#city-input');

// Array for past cities, will be displayed with a loop
var searchedCities = [];

// ! Helper Function to sort cities alphabetically, I didn't like it altogether so I didn't use it but I'm keeping it here for my notes in case I need this for a future project !
// Helper function to sort cities from https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
// Using this instead of Array.sort() because I wanted to sort the cities alphabetically
// function compareCities(a, b) {
//    // Use toUpperCase() to ignore character casing
//    // "city" here referring to the "city" key value of the object that will be returned from the Open Weather API call
//    var cityA = a.city.toUpperCase();
//    var cityB = b.city.toUpperCase();

//    var comparison = 0;
//    if (cityA > cityB) {
//        comparison = 1;
//    } else if (cityA < cityB) {
//        comparison = -1;
//    }
//    return comparison;
// }

// Local storage functions for past searched cities

// Load cities from local storage
function loadCities() {
    var storedCities = JSON.parse(localStorage.getItem('searchedCities'));
    if (storedCities) {
        searchedCities = storedCities;
    }
}

// Store cities in local storage
function storeCities() {
    localStorage.setItem('searchedCities', JSON.stringify(searchedCities));
}

// Function to build the query URL for the Open Weather API call via input

function buildURLFromInputs(city) {
    if (city) {
        return `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
    }
}

// Function to build the query URL for the Open Weather API call via ID (For stored cities)
function buildURLFromId(id) {
    return `https://api.openweathermap.org/data/2.5/weather?id=${id}&appid=${apiKey}`;
}

// Function to display the last 5 searched cities
// This is where the function I found from sitepoint comes in
function displayCities(searchedCities) {
    
    //jQuery method that removes all child nodes/content from an element, in this case the cityListEl
    cityListEl.empty();
    
    // After the element in empty, we then splice 5 elements from the searchedCities argument (Which is, in this cased, the searchedCities array)
    
    searchedCities.splice(5);
    var sortedCities = [...searchedCities];
    
    // Dynamically alter the cityDiv and cityBtn elements of the HTML document with the above information 
    sortedCities.forEach(function (location) {
        var cityDiv = $('<div>').addClass('col-12 city');
        var cityBtn = $('<button>').addClass('btn btn-light city-btn').text(location.city);
        cityDiv.append(cityBtn);
        cityListEl.append(cityDiv);
    });
}

// Function to display the last searched city
//  If there are no searched cities, it should display weather from "Austin" instead
function displayLastSearchedCity() {
   if (searchedCities[0]) {
       var queryURL = buildURLFromId(searchedCities[0].id);
       searchWeather(queryURL);
   } else {
       // if no past searched cities, load Austin weather data
       var queryURL = buildURLFromInputs("Austin");
       searchWeather(queryURL);
   }
}
// Function that will allow the UV Index to change colors on screen based on EPA ratings: https://www.epa.gov/sunsafety/uv-index-scale-0
// Green being the least harmful UV index, Purple being the worst possible UV index. 
function setUVIndexColor(UV) {
    if (UV < 3) {
        return 'green';
    } else if (UV >= 3 && UV < 6) {
        return 'yellow';
    } else if (UV >= 6 && UV < 8) {
        return 'orange';
    } else if (UV >= 8 && UV < 11) {
        return 'red';
    } else return 'purple';
}

// Search for weather conditions by calling the Open Weather API
function searchWeather(queryURL) {

    // Create an AJAX call to retrieve weather data

    $.ajax({
        url: queryURL,
        method: 'GET'
    }).then(function (response) {

        // Store current city in searchedCities 
        var city = response.name;
        var id = response.id;
        // Remove duplicate cities
        if (searchedCities[0]) {
            searchedCities = $.grep(searchedCities, function (storedCity) {
                return id !== storedCity.id;
            })
        }
        // .unshift method in assure the elements are sent to the front of the array
        searchedCities.unshift({ city, id });
        storeCities();
        displayCities(searchedCities);
        
        // Display current weather in HTML elements 
        cityEl.text(response.name);
        var formattedDate = moment.unix(response.dt).format('L');
        dateEl.text(formattedDate);
        var weatherIcon = response.weather[0].icon;
        weatherIconEl.attr('src', `https://openweathermap.org/img/wn/${weatherIcon}.png`).attr('alt', response.weather[0].description);
        temperatureEl.html(((response.main.temp - 273.15) * 1.8 + 32).toFixed(1)); //convert from k to farenheit, function taken from stackoverflow 
        humidityEl.text(response.main.humidity);
        windEl.text((response.wind.speed * 2.237).toFixed(1)); //convert kph to MPH 

        // Call OpenWeather API OneCall with lat and lon to get 5 day forecast
        var lat = response.coord.lat;
        var lon = response.coord.lon;
        var queryUrlAll = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        $.ajax({
            url: queryUrlAll,
            method: 'GET'
        }).then(function (response) {
            var uvIndex = response.current.uvi;
            var uvColor = setUVIndexColor(uvIndex);
            uvIndexEl.text(response.current.uvi);
            uvIndexEl.attr('style', `background-color: ${uvColor}; color: ${uvColor === "yellow" ? "black" : "white"}`); //manually setting the css of the UV index
            var fiveDay = response.daily; //storing the 'daily' part of the api return into an array so i can loop through them and use them to display the weather forecast

            // Display 5 day forecast in DOM elements
            for (var i = 0; i <= 5; i++) {
                var currDay = fiveDay[i];
                $(`div.day-${i} .card-title`).text(moment.unix(currDay.dt).format('L'));


                $(`div.day-${i} .forecast-img`).attr(
                    'src',
                    `https://openweathermap.org/img/wn/${currDay.weather[0].icon}.png`
                ).attr('alt', currDay.weather[0].description);

                $(`div.day-${i} .forecast-temp`).text(((currDay.temp.day - 273.15) * 1.8 + 32).toFixed(1));

                $(`div.day-${i} .forecast-humid`).text(currDay.humidity);
            }
        });
    });
}


// Event listener for search button
$('#search-btn').on('click', function (event) {
    // Preventing the button from refreshing the page
    event.preventDefault();

    // Calling the city from the input, trimming any extra whitespace for better search optimization 
    var city = cityInput.val().trim();
    city = city.replace(' ', '%20'); //So cities with whitespace in the name can be searched for 

    // Clear the input without default refresh
    cityInput.val('');

    // Build the query url with the city and searchWeather
    if (city) {
        var queryURL = buildURLFromInputs(city);
        searchWeather(queryURL);
    }
}); 

// Click handler for city buttons to load that city's weather
$(document).on('click', "button.city-btn", function (event) {
    var clickedCity = $(this).text();

    // .grep() method is the jQuery version of .filter() method in vanilla javascript, the filter here being repeated cities
    // I had to watch 2 hours of youtube vidoes to understand this concept and actually get it to work in this code 

    var foundCity = $.grep(searchedCities, function (storedCity) {
        return clickedCity === storedCity.city;
    })
    var queryURL = buildURLFromId(foundCity[0].id)
    searchWeather(queryURL);
});

// Initialization - when page loads

// load any cities in local storage into array
loadCities();
displayCities(searchedCities);

// Display weather for last searched city
displayLastSearchedCity();