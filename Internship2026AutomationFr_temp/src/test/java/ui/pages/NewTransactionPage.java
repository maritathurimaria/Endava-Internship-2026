package ui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class NewTransactionPage {

    private Page page;

    private Locator searchInput;
    private Locator amountInput;
    private Locator noteInput;
    private Locator payButton;
    private Locator returnButton;

    public void init(Page page) {
        this.page = page;

        searchInput = page.getByPlaceholder("Search...");

        amountInput = page.getByPlaceholder("Amount");

        noteInput = page.getByPlaceholder("Add a note");

        payButton = page.getByRole(
            AriaRole.BUTTON,
            new Page.GetByRoleOptions().setName("Pay").setExact(true)
        );

    returnButton = page.locator(
        "[data-test='new-transaction-return-to-transactions']"
    );

    }

    public void selectUser(String username) {
        searchInput.fill(username);

        page.getByText(
            username,
            new Page.GetByTextOptions().setExact(true)
        ).click();
    }

    public void enterAmount(String amount) {
        amountInput.fill(amount);
    }

    public void enterNote(String note) {
        noteInput.fill(note);
    }

    public void clickPay() {
        payButton.click();
    }

    public boolean isPaymentSuccessful() {
    Locator successMessage = page.getByText(
        "Transaction Submitted!",
        new Page.GetByTextOptions().setExact(true)
    );

    successMessage.waitFor(
        new Locator.WaitForOptions().setTimeout(5000)
    );

    return true;
}

    public void returnToTransactions() {
        returnButton.click();
    }
}