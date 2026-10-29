package ui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class HomePage {

    private Page page;
    // Locators
    private Locator logoutButton;
    private Locator transactionList;
    private Locator myAccountLink;
    private Locator myAccountHeading;

    private Locator newTransactionButton;
    private Locator mineTab;
    private Locator homeLink;

    public void init(Page page) {
        this.page = page;

        logoutButton = page.getByRole(
            AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Logout")
        );

        transactionList = page.locator(
            "//div[@data-test='transaction-list']"
        );

        myAccountLink = page.getByRole(
            AriaRole.LINK,
            new Page.GetByRoleOptions().setName("My Account")
        );

        myAccountHeading = page.getByRole(
            AriaRole.HEADING,
            new Page.GetByRoleOptions().setName("My Account")
        );

        newTransactionButton = page.locator("[data-test='nav-top-new-transaction']");

        mineTab = page.getByText(
            "Mine",
            new Page.GetByTextOptions().setExact(true)
        );

        homeLink = page.getByRole(
            AriaRole.LINK,
            new Page.GetByRoleOptions()
            .setName("Home")
            .setExact(true)
        );
    }

    public boolean isLogoutButtonVisible() {
        return logoutButton.isVisible();
    }

    public boolean isHomePageVisible() {
        return transactionList.isVisible();
    }

    public void navigateToMyAccount() {
        myAccountLink.click();
    }

    public boolean isMyAccountPageVisible() {
        return myAccountHeading.isVisible();
    }

    public void clickNewTransaction() {
        newTransactionButton.click();
    }

    public void clickMineTab() {
        mineTab.click();
    }
    //looks for the exact note indide the transactionlist.
    //the note also includes a timestamp so it should distinguish between different transactions, from older test transactions
   public boolean isTransactionVisible(String note) {
    Locator transaction = transactionList.getByText(
        note,
        new Locator.GetByTextOptions().setExact(true)
    );
    
    //the trans. list may take a moment to appear after you select mine so this waits up to 5s for the note to appear
    transaction.waitFor(
        new Locator.WaitForOptions().setTimeout(5000)
    );

    return transaction.isVisible();
}

    public void openTransaction(String note) {
        page.getByText(
            note,
            new Page.GetByTextOptions().setExact(true)
        ).click();
    }

    public boolean isTransactionDetailVisible() {
        return page.getByText(
            "Transaction Detail",
            new Page.GetByTextOptions().setExact(true)
        ).isVisible();
    }

    public boolean isTransactionNoteVisible(String note) {
        return page.getByText(
            note,
            new Page.GetByTextOptions().setExact(true)
        ).isVisible();
    }

    public boolean isTransactionAmountVisible(String amount) {
        return page.getByText(
            amount,
            new Page.GetByTextOptions().setExact(true)
        ).isVisible();
    }

    public void clickHome() {
    homeLink.click();
    }
}