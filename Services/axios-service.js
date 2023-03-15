import axios from "axios";
import axiosRetry from 'axios-retry';

import config from "../config.json" assert { type: 'json' };

console.log("Setting up notion connection...");

const NotionInstance = axios.create({
    baseURL: "https://api.notion.com/v1",
    headers: {
        "Authorization": `Bearer ${config.notion}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-02-22"
    }
});

axiosRetry(NotionInstance, {
    retries: 5,
    retryDelay: (retryCount, error) => {
        return retryCount * 1000 + error.headers.Retry-After;
    }
})

export const NotionAxios = NotionInstance;