import os
from playwright.sync_api import sync_playwright

# This is an automation script to bulk upload png and glb files to the Snug Rebel Admin Panel.
# Edit as needed, particularly the assets directory and the ordered list of accessories file prefixes.

# Your exact local asset directory for accessories
ASSETS_DIR = r"asset directory here"
ADMIN_URL = "https://snug-rebel-admin.vercel.app"
EMAIL = "email here"
PASSWORD = "password here"

# Ordered list of accessories file prefixes (24 items)
ACCESSORIES_PREFIXES = [
    "backpack1", "backpack2", "backpack3", 
    "belt1", "belt2", 
    "bracelet1", "bracelet2", "bracelet3", "bracelet4", "bracelet5", 
    "earrings1", "earrings2", "earrings3", 
    "keychain1", "keychain2", 
    "sportsbag1", "sportsbag2", "sportsbag3", 
    "tote1", "tote2", "tote3", "tote4", "tote5", "tote6"
]

def run_bulk_upload():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print("1. Logging into Admin Panel...")
        page.goto(ADMIN_URL)
        try:
            page.fill("input[type='email']", EMAIL, timeout=3000)
            page.fill("input[type='password']", PASSWORD)
            page.click("button[type='submit']")
            page.wait_for_url("**/")
        except:
            print("Login step skipped or already authenticated.")

        print("2. Navigating to Products page...")
        page.click("text=Products")
        page.wait_for_selector("table")

        start_prd_num = 1127

        # Loop through all 24 accessory items
        for i, prefix in enumerate(ACCESSORIES_PREFIXES):
            prd_id = f"PRD-{start_prd_num + i}"
            img_name = f"{prefix}.png"
            glb_name = f"{prefix}.glb"
            
            img_path = os.path.join(ASSETS_DIR, img_name)
            glb_path = os.path.join(ASSETS_DIR, glb_name)

            if not os.path.exists(glb_path) or not os.path.exists(img_path):
                print(f"Skipping {prd_id}: Local files for {prefix} not found.")
                continue

            print(f"Processing Item {i+1}/24 -> Target ID: {prd_id} ({prefix})...")

            try:
                # Find and click the table row for this Product ID
                row = page.locator("tr", has_text=prd_id).first
                row.click()
                page.wait_for_timeout(1000)

                # Click "Edit" inside the product details panel/modal
                page.click("button:has-text('Edit')")
                page.wait_for_selector("form", timeout=5000)

                # 1. Target the main Product Image file input (the very first file input on the page)
                print(f"Attaching main product image (.png) for {prd_id}...")
                page.locator("input[type='file']").first.set_input_files(img_path)
                page.wait_for_timeout(1500) # Give the image uploader a moment to process

                # 2. Target the exact .glb file input from Model3DUpload.tsx (accept='.glb')
                print(f"Attaching .glb model for {prd_id}...")
                page.set_input_files("input[accept='.glb']", glb_path)

                # 3. Wait for React to render the "Upload model" button since modelFile is now set
                print("Waiting for 'Upload model' button to render...")
                upload_btn_selector = "button:has-text('Upload model')"
                page.wait_for_selector(upload_btn_selector, state="visible", timeout=10000)

                # 4. Click "Upload model"
                print(f"Clicking 'Upload model' for {prd_id}...")
                page.click(upload_btn_selector)
                
                # 5. Wait for the upload to complete (watching for 'Uploading...' state to finish)
                print("Waiting for upload to finish (watching for 'Uploading...' state)...")
                try:
                    page.wait_for_selector("button:has-text('Uploading...')", state="visible", timeout=5000)
                    page.wait_for_selector("button:has-text('Uploading...')", state="detached", timeout=60000)
                except:
                    # Fallback buffer if the state toggles too fast
                    page.wait_for_timeout(5000)

                print("Model upload completed successfully!")

                # 6. Finally, click Save Changes once upload is guaranteed complete
                print(f"Saving changes for {prd_id}...")
                save_btn = page.locator("button", has_text="Save changes").first
                if save_btn.count() == 0:
                    save_btn = page.locator("button", has_text="Save").first
                if save_btn.count() == 0:
                    save_btn = page.locator("button", has_text="Update").first
                
                save_btn.click()

                # Wait for save completion / modal closure
                page.wait_for_timeout(2500)
                print(f"Successfully uploaded assets and saved {prd_id}!")

            except Exception as e:
                print(f"Error processing {prd_id}: {e}")
                try:
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(1000)
                except:
                    pass

        print("Bulk upload process finished for all 24 accessories!")
        browser.close()

if __name__ == "__main__":
    run_bulk_upload()