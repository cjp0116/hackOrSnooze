const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  static async getStories() {
    const res = await axios({
      url : `${BASE_URL}/stories`,
      method : "GET",
      data : { limit : 20, skip : 0}
    })
    const stories = res.data.stories.map(story => new Story(story));
    const storyList = new StoryList(stories);
    return storyList;
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  async addStory(user, newStory) {
    const res = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        token: user.loginToken,
        story: newStory,
      }
    });
    if(!res.statusText === "OK") {
      throw new Error("Something wen't wrong :(")
    }
    newStory = new Story(response.data.story);
    this.stories.unshift(newStory);
    user.ownStories.unshift(newStory);
    return newStory;
  }
  
  async removeStory(storyId, user) {
    const res = await axios({
      method : "DELETE",
      url : `${BASE_URL}/stories/${storyId}`,
      data : { token : user.loginToken }
    });
    if(!res.statusText === "OK") {
      throw new Error("Something wen't please try again after checking your storyId");
    }
    this.stories = this.stories.filter(s => s.storyId !== storyId);
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name
      }
    });
    const newUser = new User(response.data.user);
    newUser.loginToken = response.data.token;
    return newUser;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });
    const existingUser = new User(response.data.user);
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    existingUser.loginToken = response.data.token;
    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;
    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token
      }
    });
    const existingUser = new User(response.data.user);
    existingUser.loginToken = token;
    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    return existingUser;
  }

  async toggleFavorite(storyId, method) {
    const res = await axios({
      method,
      url : `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      data : { token : this.loginToken }
    });
    if(!res.statusText === "OK") {
      throw new Error("Something went wrong :(");
    }
    this.name = res.data.user.name;
    this.createdAt = res.data.user.createdAt;
    this.updatedAt = res.data.user.updatedAt;
    this.ownStories = res.data.user.stories.map(s => new Story(s))
    this.favorites = res.data.user.favorites.map(s => new Story(s));
    return this;
  }
}

/**
 * Class to represent a single story.
 */

class Story {

  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}