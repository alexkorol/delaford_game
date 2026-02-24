import Socket from '#server/socket.js';
import axios from 'axios';
import world from '#server/core/world.js';

class Authentication {
  /**
   * Log the player in, get the JWT token and then their profile
   *
   * @param {object} data The username/password sent to the login endpoint
   * @returns {object} Their player profile and token
   */
  static async login(data) {
    const token = await Authentication.getToken(data.data);
    const player = await Authentication.getProfile(token);
    return { player, token };
  }

  /**
   * Logs the player in and returns their JWT token
   *
   * @param {object} data The player credentials
   * @returns {Promise<string>} The JWT access token
   */
  static async getToken(data) {
    const url = `${process.env.SITE_URL}/api/auth/login`;

    try {
      const response = await axios.post(url, data);
      return response.data.access_token;
    } catch {
      throw new Error('Username and password are incorrect.');
    }
  }

  /**
   * Gets the player profile upon login
   *
   * @param {string} token Their JWT authentication token
   * @returns {Promise<object>} The player profile
   */
  static async getProfile(token) {
    const url = `${process.env.SITE_URL}/api/auth/me`;

    try {
      const response = await axios.post(url, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error('[auth] Failed to fetch profile.', error.response?.status);
      throw error;
    }
  }

  /**
   * Logs the player out and saves the data.
   *
   * @param {string} token Their JWT authentication token
   * @returns {Promise<object>} The logout response
   */
  static async logout(token) {
    const url = `${process.env.SITE_URL}/api/auth/logout`;

    try {
      const response = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Adds the player to world and logs them in
   *
   * @param {object} player The player who has just joined the server
   */
  static addPlayer(player) {
    world.addPlayer(player);

    const scene = world.getSceneForPlayer(player);

    const block = {
      player,
      map: scene.map,
      npcs: scene.npcs,
      monsters: Array.isArray(scene.monsters)
        ? scene.monsters.map((monster) => (monster && typeof monster.toJSON === 'function'
          ? monster.toJSON()
          : monster))
        : [],
      droppedItems: scene.items,
      scene: {
        id: scene.id,
        name: scene.name,
        type: scene.type,
        seed: scene.metadata && scene.metadata.seed,
      },
    };

    // Tell the client they are logging in
    Socket.emit('player:login', block);

    // Tell the world someone logged in
    const meta = {
      players: world.getScenePlayers(scene.id).map((p) => ({
        uuid: p.uuid,
        movementStep: p.movementStep,
      })),
    };

    const recipients = world.getScenePlayers(scene.id);
    Socket.broadcast('player:joined', recipients, recipients, { meta });
  }
}

export default Authentication;
