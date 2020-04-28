$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let state = {
    currentUser: null,
    storyList: null
  };

  await checkIfLoggedIn();

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    const userInstance = await User.login(username, password);

    state.currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    state.currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    localStorage.clear();
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $("#create-article").on("click", function() {
    $submitForm.slideToggle();
  })

  $("#my-article").on("click", function() {
    if(state.currentUser) {
      hideElements();
      let markup;
      $("#my-articles").empty();
      if(!state.currentUser.ownStories.length) {
        markup = $("<h3>You haven't posted any stories</h3>")
        $("#my-articles").prepend(markup)
      } else {
        for(const story of state.currentUser.ownStories) {
          markup = generateStoryHTML(story, true);
          $("#my-articles").prepend(markup)
        }
      }
      $("#my-articles").show()
    }
  })

  $("#my-favorites").on("click", function() {
    hideElements();
    if(state.currentUser) {
      $("#favorited-articles").empty();
      let markup;
      if(!state.currentUser.favorites.length) {
        markup = $("<h3>You haven't favorited any stories yet.</h3>");
        $("#favorited-articles").prepend(markup)
      }
      else {
        for(const story of state.currentUser.favorites) {
          markup = generateStoryHTML(story);
          $("#favorited-articles").prepend(markup)
        }
      }
    }
    $("#favorited-articles").show();
  })
 
  $("body").on("click", ".trash-can", async function(e) {
    hideElements();
    const id = $(e.target).closest("li").attr("id");
    await state.storyList.removeStory(id, state.currentUser);
    await generateStories();
    for(const story of state.currentUser.ownStories) {
      let markup = generateStoryHTML(story, true);
      $("#my-articles").prepend(markup)
    }
    $allStoriesList.show()
  })

  // creating new articles
  $("body").on("submit", "#submit-form", async function (e) {
    e.preventDefault();
    const title = $("#title").val();
    const author = $("#author").val();
    const url = $("#url").val();
    const storyObj = await state.storyList.addStory(state.currentUser, {
      title, author, url
    });
    const newLi = generateStoryHTML(storyObj, true)
    $allStoriesList.prepend(newLi);
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  })

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    const trashCan = isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>` : ""
    const starType = toggleFavorite(story) ? "fas" : "far";
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCan}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);
    return storyMarkup;
  }

  function toggleFavorite(story) {
    let alreadyExists = new Set();
    if(state.currentUser) {
      alreadyExists = new Set(state.currentUser.favorites.map(s => s.storyId))
    }
    return alreadyExists.has(story.storyId);
  }
  $("body").on("click", ".star", async function(e) {
    const target = $(e.target);
    const storyId = $(e.target).closest("li").attr("id");
    if(target.hasClass("fas")) {
      await state.currentUser.toggleFavorite(storyId, "DELETE")
      target.closest("i").toggleClass("fas far");
    } else {
      await state.currentUser.toggleFavorite(storyId, "POST")
      target.closest("i").toggleClass("fas far");
    }
  })
  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    state.currentUser = await User.getLoggedInUser(token, username);
    await generateStories();
    if (state.currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
    // show the stories
    $allStoriesList.show();
    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    const storyListInstance = await StoryList.getStories();
    state.storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();
    // loop through all of our stories and generate HTML for them
    for (let story of state.storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $("#favorited-articles")
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $(".main-nav-links").show();
    $("#nav-welcome").show();
    $("#nav-user-profile").text(`Welcome ${state.currentUser.username}`)
    generateProfile();
  }

  function generateProfile() {
    $("#profile-name").text(`Name: ${state.currentUser.name}`);
    $("#profile-username").text(`Username: ${state.currentUser.username}`);
    $("#profile-account-date").text(`Account Created: ${state.currentUser.createdAt.slice(0, 10)}`)
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (state.currentUser) {
      localStorage.setItem("token", state.currentUser.loginToken);
      localStorage.setItem("username", state.currentUser.username);
    }
  }
});
