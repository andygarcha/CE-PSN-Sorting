"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const psn_api_1 = require("psn-api");
async function main() {
    // 1. Authenticate and become authorized with PSN.
    // See the Authenticating Manually docs for how to get your NPSSO.
    const accessCode = await (0, psn_api_1.exchangeNpssoForCode)("pWheRcGRMhQUSXSFmJIJF1MXOc2N3aeTm0WJDXq29nI6JikQ83CD6lS9y2Cl5QjT");
    const authorization = await (0, psn_api_1.exchangeCodeForAccessToken)(accessCode);
    console.log(authorization);
    // 2. Get the user's `accountId` from the username.
    const allAccountsSearchResults = await (0, psn_api_1.makeUniversalSearch)(authorization, "andykasen13", "SocialAllAccounts");
    const searchResults2 = await (0, psn_api_1.makeUniversalSearch)(authorization, "Red Dead Redemption 2", "SocialAllAccounts");
    fetch('https://m.np.playstation.com/api/trophy/v1/users/andykasen13/trophyTitles', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "npsso": "pWheRcGRMhQUSXSFmJIJF1MXOc2N3aeTm0WJDXq29nI6JikQ83CD6lS9y2Cl5QjT" })
    })
        .then(response => response.json())
        .then(data => {
        console.log(data);
    })
        .catch(error => {
        console.error('Error fetching data:', error);
    });
    //console.log(searchResults2)
    return;
    console.log(allAccountsSearchResults.domainResponses[0]);
    if (allAccountsSearchResults.domainResponses[0].totalResultCount == 0) {
        throw new Error("Zero results!!");
    }
    const targetAccountId = allAccountsSearchResults.domainResponses[0].results[0].socialMetadata
        .accountId;
    // 3. Get the user's list of titles (games).
    const { trophyTitles } = await (0, psn_api_1.getUserTitles)(authorization, targetAccountId);
    const games = [];
    for (const title of trophyTitles) {
        // 4. Get the list of trophies for each of the user's titles.
        const { trophies: titleTrophies } = await (0, psn_api_1.getTitleTrophies)(authorization, title.npCommunicationId, "all", {
            npServiceName: title.trophyTitlePlatform !== "PS5" ? "trophy" : undefined
        });
        // 5. Get the list of _earned_ trophies for each of the user's titles.
        const { trophies: earnedTrophies } = await (0, psn_api_1.getUserTrophiesEarnedForTitle)(authorization, targetAccountId, title.npCommunicationId, "all", {
            npServiceName: title.trophyTitlePlatform !== "PS5" ? "trophy" : undefined
        });
        // 6. Merge the two trophy lists.
        const mergedTrophies = mergeTrophyLists(titleTrophies, earnedTrophies);
        games.push({
            gameName: title.trophyTitleName,
            platform: title.trophyTitlePlatform,
            trophyTypeCounts: title.definedTrophies,
            earnedCounts: title.earnedTrophies,
            trophyList: mergedTrophies
        });
    }
    // 7. Write to a JSON file.
    fs.writeFileSync("./games.json", JSON.stringify(games));
}
const mergeTrophyLists = (titleTrophies, earnedTrophies) => {
    const mergedTrophies = [];
    for (const earnedTrophy of earnedTrophies) {
        const foundTitleTrophy = titleTrophies.find((t) => t.trophyId === earnedTrophy.trophyId);
        mergedTrophies.push(normalizeTrophy({ ...earnedTrophy, ...foundTitleTrophy }));
    }
    return mergedTrophies;
};
const normalizeTrophy = (trophy) => {
    return {
        isEarned: trophy.earned ?? false,
        earnedOn: trophy.earned ? trophy.earnedDateTime : "unearned",
        type: trophy.trophyType,
        rarity: rarityMap[trophy.trophyRare ?? 0],
        earnedRate: Number(trophy.trophyEarnedRate),
        trophyName: trophy.trophyName,
        groupId: trophy.trophyGroupId
    };
};
const rarityMap = {
    [psn_api_1.TrophyRarity.VeryRare]: "Very Rare",
    [psn_api_1.TrophyRarity.UltraRare]: "Ultra Rare",
    [psn_api_1.TrophyRarity.Rare]: "Rare",
    [psn_api_1.TrophyRarity.Common]: "Common"
};
main();
