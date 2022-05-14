

const app = {};

//set up jQuery variables
app.$companyName = $(".companyName");
app.$stockSymbol = $(".stockSymbol");
app.$stockPrice = $(".stockPrice");
app.$priceMovement = $(".priceMovement");
app.$closingDate = $(".closingDate");
app.$quoteInformation = $(".quoteInformation");
app.$errorMessage = $(".errorMessage");


//list of API keys and tokens

//IEX - used to look up stock prices and history
//pk_3a3fe538d5144ff195ea95e9cf458189
// pk_d15f7a3f381346db9f154ddac430993c;
app.IEX_TOKEN_REAL = "pk_d15f7a3f381346db9f154ddac430993c";

app.IEX_URL_REAL="https://cloud.iexapis.com/stable"
//IEX sandbox for testing. displays fake pricing information
//Tpk_173dc3687f884d1487d36b97f46987a3
//Tpk_63f30e39930442bea196183cfdace008
app.IEX_TOKEN_Sandbox = "Tpk_173dc3687f884d1487d36b97f46987a3";
app.IEX_UrlBase_Sandbox="https://sandbox.iexapis.com/stable"

//Yahoo finance used to search for stock symbol
//limit of 100calls per day
//available keys - TfXZ31lJQOA3FdX7eYPFmMtZe3gdLV7k2ucFHw40 or TUuNzpRxmA7ETtH9BBzm94uVeITFekjJ1k6gNU7P or ppCJdi8seh53eszDjbCjpauSp3sVelJZ1gs2nCJz

app.yfapiBaseURL = "https://yfapi.net/";
app.yfapiKey = "oANOxzelNpxk0qhsStZf7eBaRY2v3Xz5uoD4DX63";

//set up base url and token for IEX API
app.useSandbox = false;
if(app.useSandbox){
    app.IEX_URLBASE = app.IEX_UrlBase_Sandbox;
    app.IEX_TOKEN = app.IEX_TOKEN_Sandbox;
} else {
    app.IEX_URLBASE = app.IEX_URL_REAL;
    app.IEX_TOKEN = app.IEX_TOKEN_REAL;
}

//function to use stock symbol(ticker) as input and get current stock price
//uses IEX API
app.getQuote = (symbol)=>{
    $.ajax({
        url:`${app.IEX_URLBASE}/stock/${symbol}/quote`,
        method:"GET",
        dataType:"json",
        data:{
            token:app.IEX_TOKEN
        }
    }).then((quoteInformation)=>{
        app.$stockPrice.text(`$${quoteInformation.latestPrice}`);
        const priceChange = quoteInformation.change.toFixed(2);
        const priceChangePct = (quoteInformation.changePercent*100).toFixed(2);
        app.$priceMovement.text(`$${priceChange} (${priceChangePct}%)`);
        //change the style of price movement displayed to reflect gain or loss
        if (priceChange<0){
            app.$priceMovement.css("background-color","#FCE8E6");
            app.$priceMovement.css("color","#A61212");
        } else {
            app.$priceMovement.css("background-color","#E6F4EA");
            app.$priceMovement.css("color","#479260");
        }
        app.$closingDate.text(`At close: ${quoteInformation.latestTime}`);
    }).catch(()=>{
        //if search returns no results, display error message
        app.$errorMessage.css("visibility","visible");
        app.$quoteInformation.css("visibility","hidden");
    });
};

// Uses google visualization to display area chart of historical prices
// Input - historical date and price pairs
app.drawPerformanceChart = (dateArray,priceArray) => {
    
    //convert date and price pairs to data table
    let jointArray=[["date","price"]];
    for (let i = 0; i < priceArray.length; i++) {
        jointArray.push([dateArray[i],priceArray[i]]);
    }
    var data = google.visualization.arrayToDataTable(jointArray);

    //chart display options
    var options = {
        legend: { position: 'none' },
        series: {
            0: { color: '#B8A9C9' }
        },
        hAxis: {
            format: 'MMM dd, yyyy',
            gridlines:{color:"white"}
        },
        chartArea: {
            left: 50,
            width: '87.5%'
        },
        width: '100%'
    };

    //draw chart
    var chart = new google.visualization.AreaChart(document.getElementById('priceChart'));
    chart.draw(data, options);
}


// function to use stock symbol(ticker) as input and get historical stock prices for a specific time period (e.g. 1y, 5y, ...)
// uses IEX API
app.getHistoricalPrice = (symbol, timePeriod)=>{
    $.ajax({
        url:`${app.IEX_URLBASE}/time-series/HISTORICAL_PRICES/${symbol}`,
        method:"GET",
        dataType:"json",
        data:{
            token:app.IEX_TOKEN,
            range:timePeriod
        }
    }).then((historicalInfo)=>{

        let closingPrices=[];
        historicalInfo.forEach(quote=>closingPrices.push(quote.close));

        let dates=[];
        historicalInfo.forEach(quote=>dates.push(new Date(quote.date)));        

        //draw chart
        google.charts.setOnLoadCallback(app.drawPerformanceChart(dates,closingPrices));
    }).catch(()=>{
        //if search returns no results, display error message
        app.$errorMessage.css("visibility","visible");
        app.$quoteInformation.css("visibility","hidden");
    });
};

// function to use company name, etc to search for stock symbol, and return current stock information and historical price
//uses yahoo finance api to search for symbol. Day limit = 100calls
//uses getQuote and getHistoricalPrice functions to return stock information and history
app.getStockInfo = (searchString) => {
    $.ajax({
        url:`https://shrouded-bayou-34065.herokuapp.com/${app.yfapiBaseURL}/v6/finance/autocomplete`,
        method:"GET",
        dataType:"json",
        headers:{
            "x-api-key":app.yfapiKey
        },
        data:{
            query:searchString,
            lang:"en",
            region:"US"
        }
            
        })
        .then((searchResults) => {
            const symbol = searchResults.ResultSet.Result[0].symbol;

            //if results returned, do not display error message
            app.$errorMessage.css("visibility", "hidden");

            //update HTML with company name and stock symbol
            app.$companyName.text(searchResults.ResultSet.Result[0].name);
            app.$stockSymbol.text(searchResults.ResultSet.Result[0].symbol);

            //show quote information
            app.$quoteInformation.css("visibility", "visible");
            app.getQuote(symbol);

            //display 3 month price history on chart as default
            app.getHistoricalPrice(symbol, "3m");
            $("#3m").prop("checked", true);
        })
        .catch(() => {
            //if search returns no results, display error message
            app.$errorMessage.css("visibility", "visible");
            app.$quoteInformation.css("visibility", "hidden");
        });
}


//function to get company name or stock symbol from user, and display stock information on page
app.getUserQuery = () => {
    const $input = $("#stockInput");
    const $form = $("form");

    $form.on("submit",(event)=>{
        event.preventDefault();
        const userQuery = $input.val();
        app.getStockInfo(userQuery);   
    });
}

//function to update chart of historical prices based on user inputted time period
//adds event listener to dateRange radio inputs
app.changeChartPeriod = ()=>{
    const userSelectedDate = $(".dateRange");
    userSelectedDate.on("click", (event)=>{
        app.getHistoricalPrice(app.$stockSymbol.text(),event.target.value);
    });
}

app.init = () =>{
    google.charts.load('current', {'packages':['corechart']});
    app.getUserQuery();
    app.changeChartPeriod();
}

$(document).ready(()=>{
    app.init();
});

