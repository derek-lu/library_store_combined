/**
 * The main application file.
 */
var ADOBE = ADOBE || {};

ADOBE.AppView = Backbone.View.extend({
	el: $("body"),
	
	// Stores the FolioItemView instances.
	folioItemViewArray: [],
	
	// Displays the grid of folios.
	$grid: null,
	
	// Displays the one-up view of folios.
	$largeView: null,
	
	// Collection of folios.
	libraryCollection: null,
	
	// The HTML for the subscribe buttons.
	subscriptions: "",
	
	isOnline: false,
	
	showMore: null,
	
	// The previous visibility of the "show more" link.
	showMoreWasVisible: null,
	
	folios: null,
	
	// The number of folios to add for each page.
	foliosPerPage: 12,
	
	initialize: function(isAPIAvailable, isOnline) {
		// Used to get the folios when testing on the desktop since the API is not available.
		// The value after "accountId=" should be updated with the publisher account id.
		// To find the account id, see the section titled Connecting to fulfillment in Building a custom storefront,
		// http://www.adobe.com/devnet/digitalpublishingsuite/articles/dps-custom-store.html.
		var FULFILLMENT_URL = "http://www.dpsapps.com/dps/v2_library_store_templates/fulfillment_proxy.php?accountId=ed04c68418b74672a98fdcbbb2d90878";
	
		// Whether or not this is an entitlement viewer. If true, then display the signin button, otherwise do not.
		// This should be updated by the publisher.
		var isEntitlementViewer = false;
		
		// Set a flag for the API availability in the ADOBE namespace.
		ADOBE.isAPIAvailable = isAPIAvailable;
		
		this.isOnline = isOnline;
		
		var loginLbl;
		var isShowSubscriptions;
		if (isAPIAvailable) {
			// Put the FolioStates in the ADOBE namespace for easier lookup later.
			ADOBE.FolioStates = adobeDPS.libraryService.folioStates;
			
			this.folios = [];
			// Sort the folios descending.
			var list = adobeDPS.libraryService.folioMap.sort(function (a, b) {
				if (a.publicationDate < b.publicationDate)
					return 1;
				else if (a.publicationDate > b.publicationDate)
					return -1;
				else
					return 0;
			});
	 
			// list is an associative array so put them in a regular array.
			for (var i in list) {
				var folio = list[i];
				if (this.isOnline) { // User is online so display all the folios.
					this.folios.push(folio);
				} else {			// User is offline so only display the installed folios.
					if (folio.state == ADOBE.FolioStates.INSTALLED)
						this.folios.push(folio);
				}
			}
			
			var userOwnsLatestFolio = false;
			// If the latest folio is not purchasable then the user is entitled to it.
			// If true then do not display the subscription button.
			if (this.folios.length > 0) {
				var latestFolio = this.folios[0];
				userOwnsLatestFolio = !(latestFolio.state == ADOBE.FolioStates.PURCHASABLE || latestFolio.state == ADOBE.FolioStates.UNAVAILABLE || latestFolio.state == ADOBE.FolioStates.INVALID);
			} else if (!this.isOnline) { // Folio list is empty and user is not online.
				alert("Unable to connect to the internet.");
			}

			if (!userOwnsLatestFolio) {
				// Loop through the subscriptions and populate the buttons.
				var availableSubscriptions = adobeDPS.receiptService.availableSubscriptions;
				for (var s in availableSubscriptions) {
					var availableSubscription = availableSubscriptions[s];
					if (availableSubscription.isActive()) { // Users owns a subscription so do not display the subscription menu option. 
						isShowSubscriptions = false;
						break;
					} else { // Create a string for the subscription buttons.
						this.subscriptions += "<div class='subscribe-button' id='" + availableSubscription.productId + "'>" + availableSubscription.duration + " subscription for " + availableSubscription.price + "</div>";
						isShowSubscriptions = true;
					}
				}
			}
			
			// Determine the login label for the drop down menu.
			loginLbl = adobeDPS.authenticationService.isUserAuthenticated ? "Logout" : "Subscriber Login";
		} else { // Placeholder values for testing on the desktop.
			this.subscriptions += "<div class='subscribe-button' id='1year'>1 Year Subscription for $12.99</div>";
			this.subscriptions += "<div class='subscribe-button' id='1month'>1 Month Subscription for $1.99</div>";
			loginLbl = "Subscriber Login";
		}
		
		var html  = "<div id='header'>";
		    html +=     "<div class='navbar' id='navbar' default-selected-index='1'>";
		    html +=         "<div off-skin-style='view-toggle-big-off' on-skin-style='view-toggle-big-on'></div>";
		    html +=         "<div off-skin-style='view-toggle-grid-off' on-skin-style='view-toggle-grid-on'></div>";
		    html +=     "</div>";
		    html +=     "<div class='drop-down' id='header-drop-down'>";
		    
		    // If API is not available then testing on the desktop so show the button, otherwise only if this is an entitlement viewer.
			if (!isAPIAvailable || isEntitlementViewer)
		    	html +=     "<div id='print-subscriber-login'>" + loginLbl + "</div>";
		    
			// If API is not available then testing on the desktop so show the button, otherwise only if subscriptions are available.
		    if (!isAPIAvailable || isShowSubscriptions)
			    html +=     "<div id='subscribe'>Subscribe</div>";
			
			html +=         "<div id='restore-all-purchases'>Restore Purchases</div>";
		   
		    // If testing on desktop then include the switch otherwise make sure it is supported.
		    if (!isAPIAvailable || adobeDPS.settingsService.autoArchive.isSupported)
		   		html +=         "<div id='auto-archive' class='flip-switch' state='" + (!isAPIAvailable || adobeDPS.settingsService.autoArchive.isEnabled ? "on" : "off") + "'>Auto Archive</div>";
		   
		   // The toggle button to show the "archive" buttons.
		    html +=     "</div>";
		    html +=     "<div class='toggle-button' id='edit-button' up-skin-style='black-button' selected-skin-style='blue-button'></div>";
		    html += "</div>";
		    
		    // The container to hold the grid of folios.
		    html += "<div id='grid'><div id='loading'>Loading...</div>";
		    html += "</div>"
		    html += "<div id='show-more'>Show More</div>"

		// Uncomment the textarea below to enable debug output via debug().
		//html += "<textarea class='debug'></textarea>";
		window.debug = function(value) {
			$(".debug").val($(".debug").val() + ($(".debug").val() == "" ? "" : "\n") + value);
		}
		
		$("body").html(html);
		
		// Init the controls.
		$("#navbar").navbar();
		$("#edit-button").toggleButton({upLabel: "Edit", selectedLabel: "Done"});
		$("#header-drop-down").dropDown({verticalGap: 17});
		
		this.showMore = $("#show-more");
		
		var scope = this;
		
		// Handler for the auto archive switch in the drop down.
		$("body").on("change", "#auto-archive", function(e, isOn){ scope.autoArchive_changeHandler(e, isOn) });

		// Handler for the drop down menu.
		$("body").on("change", "#header-drop-down", function(e){ scope.header_dropDownChangeHandler(e) });
		
		// Toggles between grid and one-up view.
		$("#navbar").on("change", function(e){ scope.navbar_changeHandler(e) });
		
		// Handler to toggle the archive buttons.
		$("#edit-button").on("click", function(e){ scope.editButtonClickHandler(e) });
		
		this.showMore.on("click", function(){ scope.addFolios() });

		if (ADOBE.isAPIAvailable) {
			// The collection creates a clone of the folio objects so addFolios() passes a reference to the object.
			// Since the folios are not on a server we don't need to load anything so pass the folios to the constructor.
			this.libraryCollection = new ADOBE.LibraryCollection(this.folios);
			
			// Add the folios which are currently available. On the first launch this
			// does not guarentee that all folios are immediately available. The callback
			// below for folioMap.addedSignal will handle folios which are added after
			// startup. Added does not mean, pushed from folio producer, rather they
			// are folios that the viewer becomes aware of after startup.
			this.addFolios();
			
			// Add a listener for when new folios are added.
			adobeDPS.libraryService.folioMap.addedSignal.add(function(folios) {
				for (var i = 0; i < folios.length; i++) {
					scope.addFolio(folios[i]);
				}
			}, this);
		} else {
			_.bindAll(this, "addFolios");
			this.libraryCollection = new ADOBE.LibraryCollection();
			this.libraryCollection.url = FULFILLMENT_URL;
			this.libraryCollection.on("all", this.addFolios);
			this.libraryCollection.fetch({dataType: "xml"});
		}
	},
	
	addFolios: function() {
		if (this.libraryCollection.length > 0)
			$("#loading").remove();
		
		var startIndex = $("#grid").children().length;
		
		var endIndex = Math.min(startIndex + this.foliosPerPage, this.libraryCollection.length);
		for (var i = startIndex; i < endIndex; i++) {
			// When using the DPS api this is a clone of the original folio.
			var folio = this.libraryCollection.at(i);
			
			// Testing on the desktop so create the path to the image.
			if (!ADOBE.isAPIAvailable)
				folio.attributes.libraryPreviewUrl +=  "/portrait";
				
			var view = new ADOBE.FolioItemView({model: folio});
			var el = view.render().el;
			$("#grid").append(el);
			
			this.folioItemViewArray.push(view);
		}
		
		this.setGridHeight();
	},
	
	// This will be triggered when folios are added through the API.
	addFolio: function(folio) {
		$("#loading").remove();
		
		var len = this.folios.length;
		// Find the insert index. Folios are sorted by publicationDate with the most recent first.
		for (var i = 0; i < len; i++) {
			if (folio.publicationDate >= this.folios[i].publicationDate)
				break;
		}
		
		// Add the folio to the collection.
		this.libraryCollection.add(folio, {at: i});
		
		// Add the folio to the folios.
		this.folios.splice(i, 0, folio);
		
		var grid = $("#grid");
		// Figure out if this folio should be dispayed.
		// Folios can be added in any order so see if this folio is within the range of publication
		// dates of the folios that are currently displayed.
		var numFoliosDisplayed = $("#grid").children().length;
		var endIndex = Math.max(this.foliosPerPage, numFoliosDisplayed);
		if (i < endIndex) {
			var view;
			// See more button is visible so remove the last folio view before inserting a new one.
			if (numFoliosDisplayed >= this.foliosPerPage) {
				$("#grid div.folio-item-view:last-child").remove();
				 view = this.folioItemViewArray.pop();
				 view.clear();
			}
				
			view = new ADOBE.FolioItemView({model: this.libraryCollection.at(i)});
			var el = view.render().el;
			
			if (numFoliosDisplayed == 0)
				$("#grid").append(el);
			else
				$("#grid div.folio-item-view").eq(i).before(el);
				
			this.folioItemViewArray.push(view);
		}
		
		this.setGridHeight();
	},
	
	setGridHeight: function() {
		var numFoliosDisplayed = $("#grid").children().length;
		
		// Explcitly size the height of grid so the background image repeats to the correct height
		// since we are using absolute coordinates. minHeight is set via CSS.
		$("#grid").css("height", Math.ceil(numFoliosDisplayed / 2) * 156);
		
		this.showMore.css("display", numFoliosDisplayed < this.libraryCollection.length ? "block" : "none");
	},
	
	// Handler for the drop down menu.
	header_dropDownChangeHandler: function(e) {
		var selectedLabel = $(e.target).dropDown("getSelectedLabel");
		if (selectedLabel == "Subscriber Login" || selectedLabel == "Logout") {			// Display the login dialog or logout the user.
			if (!ADOBE.isAPIAvailable || !adobeDPS.authenticationService.isUserAuthenticated) {
				this.displayLoginDialog();
			} else {
				adobeDPS.authenticationService.logout();
				
				// Update the label of the item in the drop down menu.
				$("#print-subscriber-login").html("Subscriber Login");				
				$(e.target).dropDown("invalidate");
			}
		} else if (selectedLabel == "Subscribe") {	// Display the subscribe dialog.
			var subscribeDialog = new ADOBE.SubscribeDialog({model: this.subscriptions});
			$("body").append(subscribeDialog.render().el);
			subscribeDialog.open();
		
			// Triggered from the dialog when a purchase is successful.
			$("body").on("subscriptionPurchased", function() {
				// Remove the subscribe button from the dropdown.
				$("#subscribe").remove();
				
				// Invalidate the dropdown so the button is removed.
				$("#header-drop-down").dropDown("invalidate");
				
				$("body").off("subscriptionPurchased");
			});
		} else if (selectedLabel == "Restore Purchases") {	// Display the restore dialog.
			var restoreDialog = new ADOBE.RestoreDialog();
			$("body").append(restoreDialog.render().el);
			restoreDialog.open();
		}
	},
	
	// Handler for when a user changes the auto archive setting.
	autoArchive_changeHandler: function(e, isOn) {
		adobeDPS.settingsService.autoArchive.toggle(isOn);
	},
	
	// Handler for toggling the view between one-up and grid view.
	navbar_changeHandler: function(e) {
		var selectedIndex = $(e.currentTarget).navbar("getSelectedIndex");
		if (selectedIndex == 0) { // Display the large view.
			this.$grid = $("#grid").detach();
			$("#edit-button").css("display", "none");
			this.showMoreWasVisible = this.showMore.css("display") == "block";
			this.showMore.detach();
			
			var isInited = true;
			if (!this.$largeView) {
				this.$largeView = $("<div id='large-view-wrapper'><div id='large-view' class='slideshow'></div></div>");
				isInited = false;
			}
			
			this.$largeView.appendTo("body");
			
			if (!isInited) {
				$("#large-view").slideshow({
											renderer: ADOBE.LargeFolioItemView, // Renders each item in the slideshow.
											data: this.libraryCollection,		// The data used to pass to each renderer.
											itemWidth: 600,						// The width of each item.
											horizontalGap: 30
										   });
			}
		} else { // Display the grid view. This is the default view.
			this.$largeView.detach();
			this.$grid.appendTo("body");
			$("#edit-button").css("display", "inline");
			
			if (this.showMoreWasVisible)
				this.showMore.appendTo("body");
		}
	},
	
	// Handler for when a user clicks the edit button.
	// This will display the archive button for folios that can be archived.
	editButtonClickHandler: function(e) {
		var isShowArchiveButton = !$(e.currentTarget).toggleButton("getState");
		var len = this.folioItemViewArray.length;
		for (var i = 0; i < len; i++) {
			this.folioItemViewArray[i].showArchiveButton(isShowArchiveButton);
		}
	},
	
	// Displays the login dialog.
	displayLoginDialog: function() {
		var loginDialog = new ADOBE.LoginDialog();
		$("body").append(loginDialog.render().el);
		loginDialog.open();
		
		// Triggered from the dialog when a login is successful.
		loginDialog.$el.on("loginSuccess", function() {
			$("#print-subscriber-login").html("Logout");
			$("#print-subscriber-login").parent().dropDown("invalidate");
		});
	}
});