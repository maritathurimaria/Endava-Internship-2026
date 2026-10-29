package ui.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class LoginPage {

    private Page page;
    private HomePage homePage;
    private final String signinRoute = "/signin";
    private final String homePageTransactionList = "//div[@data-test='transaction-list']";

    // Locators
    private Locator usernameInput;
    private Locator passwordInput;
    private Locator signButton;  // = login button

    // Initialization
    public void init(Page page) {
        this.page = page;

        usernameInput = page.locator("#username");
        passwordInput = page.locator("#password");
        signButton = page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign In"));
    }

    public void openLoginPage(String baseUrl) {
        page.navigate(baseUrl + signinRoute);
    }

    public void enterUsername(String username) {
        usernameInput.fill(username);
    }

    public void enterPassword(String password) {
        passwordInput.fill(password);
    }

    public void clickLogin() {
        signButton.click();
    }

    public HomePage login(String username, String password) {
        enterUsername(username);
        enterPassword(password);
        clickLogin();

        page.locator(homePageTransactionList).waitFor();
        HomePage homePage = new HomePage();
        homePage.init(page);

        return homePage;
    }


    public boolean isLoginErrorVisible() {
        Locator errorMessage = page.getByText(
            "Username or password is invalid",
            new Page.GetByTextOptions().setExact(true)
        );
        
        errorMessage.waitFor(new Locator.WaitForOptions().setTimeout(5000));
        return errorMessage.isVisible();
    }

    public boolean isLoginFormVisible() {
        return usernameInput.isVisible() && passwordInput.isVisible();
    }
}